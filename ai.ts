import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// Initialize the OpenAI client
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the schema for car information
const carSchema = z.object({
  brand: z.string(),
  model: z.string(),
  power: z.string().optional(),
});

export async function extractCarInfos(url: string, description: string) {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
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

export async function extractComputerInfos(computer: {description_norm: string}) {

  console.log("ai thinking...");

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: computerSchema,
    prompt: `Extract the Computer brand, processor name, memory size, storage capacity and screen size (if available) from the following description: "${computer.description_norm}"`,
  });

  return {...computer, ...object};
}

