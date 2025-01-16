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

let isRequestPending = false;

app.post('/chatToDocument', async (c) => {
  if (isRequestPending) {
    return c.json({ error: 'Too many requests. Please wait.' }, 429);
  }

  isRequestPending = true;

  try {
    console.log("Incoming request data:", await c.req.json());

    const openai = new OpenAI({ apiKey: c.env.OPEN_AI_KEY });
    const { documentData, question } = await c.req.json();

    const truncatedDocument = documentData.substring(0, 2000); 
    console.log("Sending data to OpenAI:", { truncatedDocument, question });

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an assistant. Here is a document: ${truncatedDocument}. Answer this question: ${question}.`,
        },
      ],
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
    });

    const response = chatCompletion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log("OpenAI response:", response);

    return c.json({ message: response });

  } catch (error) {
    console.error("Error in /chatToDocument route:", error);

    if (error instanceof Error) {
      return c.json({ error: error.message || 'An error occurred.' }, 500);
    } else {
      return c.json({ error: 'An unknown error occurred.' }, 500);
    }
  } finally {
    isRequestPending = false;
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
  
	return c.json({ translated_text: response.translated_text });
  });

export default app;
