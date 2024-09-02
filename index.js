import { csvParse } from 'd3-dsv'
import * as aq from 'arquero';
import { exit } from 'process';

import { watch } from "fs";

const watchedDir = `${import.meta.dir}/csv`

console.log('watching ', watchedDir);

const brands = ['renault', 'citroen', 'peugeot', 'fiat', 'dacia', 'kia', 'skoda', 'ford', 'mpm']
  
const models = {
  renault: ['zoe', 'twingo'],
  citroen: ['c1', 'c2', 'c3'],
  fiat: ['panda', 'ddr'],
  peugeot: ['108', '208', '308'],
}

const variants = {
  renault: ['twingo iii', 'twingo v'],
  citroen: ['vc1', 'vc2', 'vc3'],
  fiat: ['panda iii', 'panda 2020'],
  peugeot: ['108', '208', '308'],
}

function findBrandFrom(content){

  for (const brand of brands){
     let foundBrand = getBrand(content)
     if (foundBrand) return foundBrand
    
     let foundModel = getBrandModel(brand, content)
   if (foundModel) return brand

    const foundVariant = getBrandVariant(brand, content)
    if (foundVariant) return brand
  }

  return null
}

function getBrand(content){
  return brands.find(b => content.includes(b))
}

function getBrandModel(brand, content){
  if (!models[brand]) return `unknown brand ${brand} in models`
  const found = models[brand].find((m => content.includes(m)))
  if (!found) return null
  return found
}

function getBrandVariant(brand, content){
  if (!variants[brand]) return `unknown brand ${brand} in variants`
  const found = variants[brand].find((v => content.includes(v)))
  if (!found) return null
  return found
}

async function parseCSV(file) {
  console.log("🚀 ~ parseCSV ~ file:", file.size)
  const exist = await file.exists()

  if (!exist) {
    throw new Error(`File ${file.name} does not exist`)
    exit()
  }

  const text = await file.text();
  return csvParse(text);
}

async function ingest(filename) {
  const files = [Bun.file(`${watchedDir}/${filename}`)]
  const parsedFiles = await Promise.all(files.map(parseCSV));
  const combinedData = parsedFiles.reduce((acc, data) => acc.concat(data), []);
  return aq.from(combinedData);
}

function normalize_description(content) {
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

  try {
    const carsData = await ingest(filename);
    const cars = transform(carsData);
    cars.print()
    
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