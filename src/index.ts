import OpenAI from 'openai';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
	OPEN_AI_KEY: string;
	AI: Ai;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
	'/*',
	cors({
		origin: '*',
		allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests', 'Content-Type'],
		allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
		exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
		maxAge: 600,
		credentials: true,
	})
);

app.get('/', (c) => {
	return c.text('Hono backend is up and running!');
});

app.post('/chatToDocument', async (c) => {
	try {
	  // Log request body for debugging
	  const { documentData, question } = await c.req.json();
	  console.log("Received request:", { documentData, question });
  
	  // Ensure the OpenAI API key is available
	  console.log("OPEN_AI_KEY:", c.env.OPEN_AI_KEY);
  
	  // Initialize OpenAI API client
	  const openai = new OpenAI({
		apiKey: c.env.OPEN_AI_KEY,
	  });
  
	  // Prepare request to OpenAI API
	  const chatCompletion = await openai.chat.completions.create({
		messages: [
		  {
			role: 'system',
			content:
			  'You are an assistant helping the user to chat to a document, I am providing a JSON file of the markdown for the document. Using this, answer the user question in the clearest way possible. The document is about: ' +
			  documentData,
		  },
		  {
			role: 'user',
			content: 'My question is: ' + question,
		  },
		],
		model: 'gpt-3.5-turbo',
		temperature: 0.5,
	  });
  
	  // Log the response from OpenAI for debugging
	  console.log("OpenAI response:", chatCompletion);
  
	  // Check if the response is valid and return the answer
	  if (chatCompletion?.choices?.length > 0) {
		const response = chatCompletion.choices[0]?.message?.content;
		return c.json({ message: response });
	  } else {
		// Handle case where no valid response is returned
		console.error("No response returned from OpenAI.");
		return c.json({ error: "No valid response from OpenAI." }, 500);
	  }
	} catch (error) {
	  // Log the error for debugging
	  console.error("Error occurred during /chatToDocument:", error);
	  
	  // Return a generic error message for now
	  return c.json({ error: "An error occurred while processing the request." }, 500);
	}
  });

app.post('/translateDocument', async (c) => {
	const { documentData, targetLang } = await c.req.json();

	const summaryResponse = await c.env.AI.run('@cf/facebook/bart-large-cnn', {
		input_text: documentData,
		max_length: 1000,
	});

	const response = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
		text: summaryResponse.summary,
		source_lang: 'english',
		target_lang: targetLang,
	});

	return new Response(JSON.stringify(response));
});

export default app;
