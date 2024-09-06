import OpenAI from 'openai'
import { generateObject } from 'ai'; // see https://github.com/vercel/ai/blob/main/packages/ai/core/generate-object/generate-object.ts
import { createOpenAI } from '@ai-sdk/openai';
//import { createOllama } from 'ollama-ai-provider';
import ollama, { type GenerateRequest } from 'ollama';
import { z } from 'zod';
import type { ColumnTable, Table } from 'arquero';

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

export async function extractComputerInfos(computer: { description_norm: string }) {

  console.log("Openai thinking...");

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: computerSchema,
    prompt: `Extract the Computer brand, processor name, memory size, storage capacity and screen size (if available) from the following description: "${computer.description_norm}", when a value is null, write "unknown"`,
  });

  return { ...computer, ...object };
}

// using a model without "generate object" feature
export async function generateLocally(computers?: { description_norm: string }[]) {

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

export type InferColumn = {
  name: string;
  definition: string;
}

export async function inferScrappedColumnsNames(domainName: string, columnsToMatch: InferColumn[], data: ColumnTable) {

  const { cleanDataRowContent } = keepValidColumns(data);

  const dataColumnNames = cleanDataRowContent.columnNames()
  // console.log("🚀 ~ inferScrappedColumnsNames ~ cleanDataRowContent.data():", cleanDataRowContent.data())
  // return 
  const columnsNames = columnsToMatch.map(({ name }) => name);

  const definitions = columnsToMatch.map((nm) => `${nm.name} - ${nm.definition}`).join("\n")

  const getPromptForColumn = (columnName: string) => {

   console.log("🚀 ~ inferScrappedColumnsNames ~  cleanDataRowContent.data()[columnName]:", cleanDataRowContent.data()[columnName])

    return (`All values in this array ${JSON.stringify(cleanDataRowContent.data()[columnName])} are representing the same property of an ad of a ${domainName}.
     I need you to infer the name of the property based on the following definitions:

    ${definitions}

  Finally this property should match one of following names: ${columnsNames.join(', ')}
  In case there is no match, please return "unknown" as the property name.
  Do not add any comment or word other than the infered property name.
  `)
  // Please explain how you did infer this column name.
  };

  // Always answer with only an array of strings, without additional information

  // Finally return the array of ${cleanDataRowContent.numCols()} columns in the same order as corresponding columns of the provided table.
  // Do not add any comment or word other than the array.

  // console.log("🚀 ~ inferScrappedColumnsNames ~ prompt:", userPrompts[1].content)

  let inferedNames = []

  for (const columnName of dataColumnNames) {

  const generated = await openaiClient.chat.completions.create({
    "model": "llama3",
    "messages": [
      {
        "role": "system",
        "content": `You are a helpful data analyst in the domain of ${domainName} and you want to infer the name of properties of a ${domainName} from unstructured text.`
      },
      {
        "role": "user",
        "content": getPromptForColumn(columnName),
      }
    ],
  })

  const inferedColumnName = generated.choices[0].message.content || "unknown";

  console.log("infered column name:", inferedColumnName,'\n');

  const isInList = columnsNames.indexOf(inferedColumnName) >= 0? true : false;

  inferedNames.push(isInList ? inferedColumnName : "unknown")
  }
  console.log("🚀 ~ inferScrappedColumnsNames ~ inferedNames:", inferedNames)

  return inferedNames;
}

// remove indecies of columns with multi lines contents OR with more than 200 chars
export function getValidIndices(row: Record<string, string>) {
  return Object.entries(row)
    .map(([key, value], i) => {
      const result = (value.length < 200) && (!value.includes('\n')) ? i : undefined
      // console.log(`🚀  ~ inferScrappedColumnsNames  ~ value.length:${i}(${value.length}) => ${result}:${value}`);
      return result;
    })
    .filter(index => index !== undefined);
}

export function keepValidColumns(data: ColumnTable) {
  const dataRow = data.sample(3) //.slice(1, 3);

  const validColumnsIndices = getValidIndices(dataRow.object(0));

  const cleanDataRowContent = dataRow.select(validColumnsIndices);

  cleanDataRowContent.print();

  return { cleanDataRowContent };
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