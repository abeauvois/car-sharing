import OpenAI from 'openai'
import { generateObject } from 'ai'; // see https://github.com/vercel/ai/blob/main/packages/ai/core/generate-object/generate-object.ts
import { createOpenAI } from '@ai-sdk/openai';
//import { createOllama } from 'ollama-ai-provider';
import ollama, { type GenerateRequest } from 'ollama';
import { z } from 'zod';

// Initialize the OpenAI client
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openaiClient = new OpenAI({
  baseURL: 'http://host.docker.internal:11434/v1/',
  apiKey: 'ollama', // required but unused
})

// const model = openai('gpt-4o-mini')
// const model = ollama('llama3')

// note:
// When using Llama.cpp for object generation, it is important to choose a model that is 
// capable of creating the object that you want. I had good results with openhermes2.5-mistral and mixtral, for example, but this depends on your use case.
// see: https://modelfusion.dev/guide/function/generate-object/
// const model = createOllama({
//   baseUrl: "http://localhost:11434/api",
//   molel: 'openhermes2.5-mistral',
// })
// const model = ollama.embedding('nomic-embed-text');


// Define the schema for car information
const carSchema = z.object({
  brand: z.string(),
  model: z.string(),
  power: z.string().optional(),
});

export async function extractCarInfos(url: string, description: string) {
  const { object } = await generateObject({
    model:  openai('gpt-4o-mini'),
    schema: carSchema,
    prompt: `Extract the car brand, model, and power (if available) from the following description: "${description}" and add the url ${url} as the first column. Keep in mind 
    the following car brands and their models:

    renault: ['zoe', 'twingo']
    citroen: ['c1', 'c2', 'c3']
    fiat: ['panda']
    peugeot: ['108', '208', '308']
    
    `,
  });

  return object;
}

// Define the schema for computer information
const computerSchema = z.object({
  computer_brand: z.string(),
  processor_name: z.string(),
  memory_size: z.string(),
  storage_capacity: z.string().optional(),
  screen_size: z.string().optional(),
});

export async function extractComputerInfos(computer: { description_norm: string }) {

  console.log("Openai thinking...");

  const { object } = await generateObject({
    model:  openai('gpt-4o-mini'),
    schema: computerSchema,
    prompt: `Extract the Computer brand, processor name, memory size, storage capacity and screen size (if available) from the following description: "${computer.description_norm}", when a value is null, write "unknown"`,
  });

  return { ...computer, ...object };
}

// using a model without "generate object" feature

export async function generateLocally(computers?: {description_norm: string}[]) {

  if (!computers?.length) {
    console.log("No computers to analyse");
    return;
  }

  console.log("Ollama ai thinking...");

  const generated = await openaiClient.chat.completions.create({
    "model": "llama3",
    "messages": [
      {
        "role": "user", 
        "content": `Extract the Computer brand, processor name, memory size, storage capacity and screen size (if available) 
for each description in the following array : ${JSON.stringify(computers.map(c => c.description_norm))}? And return your answer as an array of json objects?
  `}],
  })
  console.log("🚀 ~ generateLocally ~ generated:", generated.choices[0].message.content);

  return generated;

}


// ApiGenerateResponse
// {
//   "model": "llama3",
//   "created_at": "2023-11-09T21:07:55.186497Z",
//   "response": "{\n\"morning\": {\n\"color\": \"blue\"\n},\n\"noon\": {\n\"color\": \"blue-gray\"\n},\n\"afternoon\": {\n\"color\": \"warm gray\"\n},\n\"evening\": {\n\"color\": \"orange\"\n}\n}\n",
//   "done": true,
//   "context": [1, 2, 3],
//   "total_duration": 4648158584,
//   "load_duration": 4071084,
//   "prompt_eval_count": 36,
//   "prompt_eval_duration": 439038000,
//   "eval_count": 180,
//   "eval_duration": 4196918000
// }