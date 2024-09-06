import * as aq from 'arquero';
import { exit } from 'process';

import { watch } from "fs";
import { ingest } from './ingest';
import { findBrandFrom } from './car.domain';
import { extractCarInfos, extractComputerInfos, generateLocally, inferScrappedColumnsNames, type InferColumn } from './ai';

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

function transformCarsData(carsData) {
  const items = carsData.select(aq.names('url', 'url2', 'seller', 'description', 'price', 'pack', 'properties', 'year', 'mileage', 'energy', 'gear', 'address'))

  return items.derive({ price_int: car => op.parse_int(op.replace(op.replace(car.price, '€', ''), /[\s\\]/g, '')) })
    .derive({ description_norm: aq.escape(c => normalize_description(c.description)) })
    .derive({ brand: aq.escape(c => findBrandFrom(c.description_norm)) })
    .derive({ model: car => op.slice(op.match(car.description_norm, /(\w*\s?)/), 0, 1)[0] })
    .derive({ mileage_int: car => op.parse_int(op.replace(op.replace(car.mileage, 'km', ''), /[\s\\]/g, '')) })
    .select('description_norm', 'brand', 'model', 'price_int', 'year', 'mileage_int')
    //.select('description_norm', 'model', 'price_int', 'year', 'mileage_int')
    .filter(car => car.price_int)
}

async function extractCarInfosFromDescription(cars) {
  const colValues = Array.from(cars.values('description_norm'));
  const result = await Promise.all(colValues.map(extractCarInfos))
  console.log("🚀 ~ ai cars ~ result:", result)
}

async function extractComputerInfosFromDescription(computers: aq.Table) {
  const colValues = computers.objects({ columns: ['url', 'description_norm', 'price_int', 'quality', 'volume_int'] });
  //console.log("🚀 ~ extractComputerInfosFromDescription ~ colValues:", colValues)
  // const result = await Promise.all(colValues.map(extractComputerInfos))
  const result = await generateLocally(colValues);

  console.log("🚀 ~ ai computers ~ result:", result)
  return result;
}

function transformComputersData(computersData: aq.ColumnTable): aq.Table {
  // TODO: clean the data (columns names in particular)

  // 'url', 'seller', 'company', 'rating1', 'rating2', 'volume', 'description', 'price1', 'quality', 'seller2', 'delivery', 'address'
  const columnsToMatch: InferColumn[] = [
    { name: 'url', definition: 'a link to a web page'},
    { name: 'seller', definition: 'if the person who sell the object is "Vendeur pro"' },
    { name: 'company', definition: 'name of a company' },
    { name: 'quality', definition: 'the state of the object like "neuf", "new", "used", "bon état" ' },
    { name: 'volume', definition: 'number in parenthesis' },
    { name: 'description', definition: 'details of the computer, very specific informations like the storage capacity and memory'},
    { name: 'price', definition: 'contains numbers with a currency char like $ or €' },
    { name: 'zipcode', definition: 'a text containing a zipcode' },
    { name: 'address', definition: 'a text containing a street name' },
    { name: 'date', definition: 'a text containing date or time or both' },

  ]

  // Infere columns names from the first row
   const inferedColumnsNames = inferScrappedColumnsNames('computer', columnsToMatch, computersData);
  // const items = computersData.select(aq.names(inferScrappedColumnsNames)

  //  const items = computersData.select(aq.names('url', 'seller', 'company', 'rating1', 'rating2', 'volume', 'definition', 'price1', 'quality', 'seller2', 'delivery', 'address'))
  // // const items = computersData.select(aq.names('url', 'seller', 'company', 'volume', 'description', 'price1', 'quality', 'seller2', 'delivery', 'address', 'price2', 'price variation'))

  // return items.derive({ price_int: computer => op.parse_int(op.replace(op.replace(computer.price1, '€', ''), /[\s\\]/g, '')) })
  //   .derive({ description_norm: aq.escape(c => normalize_description(c.description)) })
  //   //.derive({brand: aq.escape(c => findBrandFrom (c.description_norm))})
  //   .derive({ volume_int: computer => op.slice(op.match(computer.volume, /(\d*)/), 0, 1)[0] })
  //   .select('url', 'description_norm', 'price1', 'price_int', 'quality', 'volume_int')
  //   .filter(computer => computer.price_int) // remove null prices
  //   .slice(0, 15) // limit to 15 first computers
  //.slice(15)
}


const watcher = watch(watchedDir, async (event, filename) => {
  console.log(`Detected ${event} in ${filename}`);

  // case of filename is undefined
  if (!filename || filename === 'index.js') throw new Error('No filename provided');

  try {

    if (filename.includes('computer')) {
      console.log('Processing computers data...');

      const computersData = await ingest(watchedDir, filename);
      const computers = transformComputersData(computersData);
      // computers.print(100)

      //  const enrichedComputers = await extractComputerInfosFromDescription(computers)

      // const cleanComputers = enrichedComputers.map(computer => {
      //   return {
      //     ...computer,
      //     processor: computer.processor_name.match(/M\d/)?.[0],
      //     hasSSD: computer.storage_capacity?.toLowerCase().includes('ssd'),
      //     storage_int: Number(computer.storage_capacity?.toLowerCase().replace(' ssd', '').replace('tb', 'to').replace('gb', 'go').replace('to', '000').replace('go', '').replace(' ', '').replace('notspecified', ''))
      //   }
      // })

      // // transform enrichedComputers in json and save it with BunFile
      // const json = JSON.stringify(cleanComputers, null, ' ')
      // await Bun.write(`./output/enriched-${filename.split('.')[0]}.json`, json);

      return
    }

    const carsData = await ingest(watchedDir, filename);
    const cars = transformCarsData(carsData);
    cars.print(100)
    //cars.print({limit: 100})

    extractCarInfosFromDescription(cars)

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