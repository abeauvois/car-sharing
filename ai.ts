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

export async function extractCarInfo(description: string) {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: carSchema,
    prompt: `Extract the car brand, model, and power (if available) from the following description: "${description}". Keep in mind 
    the following car brands and their models:

    renault: ['zoe', 'twingo']
    citroen: ['c1', 'c2', 'c3']
    fiat: ['panda']
    peugeot: ['108', '208', '308']
    
    `,
  });

  return object;
}

