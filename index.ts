import * as aq from 'arquero';
import { exit } from 'process';

import { watch } from "fs";
import { ingest } from './ingest';
import { findBrandFrom } from './car.domain';
import { extractCarInfo } from './ai';

const watchedDir = `${import.meta.dir}/csv`

console.log('watching ', watchedDir);

function normalize_description(content: string) {
  return content.toLowerCase()            // map to lower case
    .replace(/[%#$£()\'\"]/g, '')      // remove unwanted characters
    //.replace(/[ /,+.*:\-\r\n@]/g, '_') // replace spacing and punctuation with an underscore
    .replace(/_+/g, '_')               // collapse repeated underscores
    .normalize('NFD')                  // perform unicode normalization
    .replace(/[\u0300-\u036f]/g, '');  // strip accents from characters
}

function transform(data){
  const items = data.select(aq.names('url', 'url2', 'seller', 'description', 'price', 'pack', 'properties', 'year', 'mileage', 'energy', 'gear', 'address'))
  
  return items.derive({ price_int: car => op.parse_int(op.replace(op.replace(car.price, '€', ''), /[\s\\]/g, '')) })
    .derive({ description_norm: aq.escape(c => normalize_description(c.description)) })
    .derive({brand: aq.escape(c => findBrandFrom (c.description_norm))})
    .derive({ model: car => op.slice(op.match(car.description_norm, /(\w*\s?)/), 0, 1)[0] })
    .derive({ mileage_int: car => op.parse_int(op.replace(op.replace(car.mileage, 'km', ''), /[\s\\]/g, '')) })
    .select('description_norm', 'brand', 'model','price_int','year', 'mileage_int')
    //.select('description_norm', 'model', 'price_int', 'year', 'mileage_int')
    .filter(car => car.price_int)
}


const watcher = watch(watchedDir, async (event, filename) => {
  console.log(`Detected ${event} in ${filename}`);

  // case of filename is undefined
  if (!filename || filename === 'index.js') throw new Error('No filename provided');

  try {
    const carsData = await ingest(watchedDir, filename);
    const cars = transform(carsData);
    cars.print()
    const colValues = Array.from(cars.values('description_norm'));

    const result = await Promise.all(colValues.map(extractCarInfo))
    console.log("🚀 ~ watcher ~ result:", result)
    // const carInfo = await extractCarInfo(row['description']);
    
  } catch (error) {
    console.error(`Error while processing ${filename}:`, error)
    exit();
  }
});

process.on("SIGINT", () => {
  // close watcher when Ctrl-C is pressed
  console.log("Closing watcher...");
  watcher.close();
  process.exit(0);
});