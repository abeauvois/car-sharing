import type { BunFile } from 'bun';
import { exit } from 'process';

import * as aq from 'arquero';
import  { csvParse, type DSVRowArray } from "d3-dsv";

export async function parseCSV(file: BunFile) {
    console.log("🚀 ~ parseCSV ~ file size:", file.size)
    const exist = await file.exists()
  
    if (!exist) {
      throw new Error(`File ${file.name} does not exist`)
    }
  
    const text = await file.text();
    return csvParse(text);
  }
  
  export async function ingest(watchedDir: string, filename: string): Promise<aq.ColumnTable> {
    const files = [Bun.file(`${watchedDir}/${filename}`)]
    const parsedFiles = await Promise.all(files.map(parseCSV));
    const combinedData = parsedFiles.reduce((acc, data) => acc.concat(data), [] as DSVRowArray<string>[]);
    return aq.from(combinedData);
  }