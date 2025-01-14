import OpenAI from "openai";
import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  OPENAI_API_KEY: string;
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

// Default route for debugging
app.get('/', (c) => {
  return c.text('Hono backend is up and running!');
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