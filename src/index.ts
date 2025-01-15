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
	  // Log incoming request data
	  console.log("Incoming request data:", await c.req.json());
  
	  const openai = new OpenAI({
		apiKey: c.env.OPEN_AI_KEY,
	  });
  
	  const { documentData, question } = await c.req.json();
  
	  // Log data being sent to OpenAI API
	  console.log("Sending data to OpenAI:", { documentData, question });
  
	  const chatCompletion = await openai.chat.completions.create({
		messages: [
		  {
			role: 'system',
			content: 'You are an assistant helping the user to chat to a document, I am providing a JSON file of the markdown for the document. Using this, answer the user question in the clearest way possible. The document is about: ' + documentData,
		  },
		  {
			role: 'user',
			content: 'My question is: ' + question,
		  },
		],
		model: 'gpt-4', // Or update to another model as necessary
		temperature: 0.5,
	  });
  
	  const response = chatCompletion.choices[0]?.message?.content;
  
	  if (!response) {
		throw new Error('No response from OpenAI');
	  }
  
	  // Log the OpenAI response
	  console.log("OpenAI response:", response);
  
	  return c.json({ message: response });
  
	} catch (error: unknown) {
	  // Log any errors that occur
	  console.error("Error in /chatToDocument route:", error);
  
	  if (error instanceof Error) {
		return c.json({ error: error.message || 'An error occurred while processing the request.' }, 500);
	  } else {
		return c.json({ error: 'An unknown error occurred while processing the request.' }, 500);
	  }
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
