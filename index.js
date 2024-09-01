import {csvParse} from 'd3-dsv'
import * as aq from 'arquero';
import { exit } from 'process';

//import { readdir } from "node:fs/promises";

// read all the files in the current directory, recursively
// const files = await readdir("../", { recursive: true });

function normalize_description(content) {
  return content.toLowerCase()            // map to lower case
    .replace(/[%#$£()\'\"]/g, '')      // remove unwanted characters
    //.replace(/[ /,+.*:\-\r\n@]/g, '_') // replace spacing and punctuation with an underscore
    .replace(/_+/g, '_')               // collapse repeated underscores
    .normalize('NFD')                  // perform unicode normalization
    .replace(/[\u0300-\u036f]/g, '');  // strip accents from characters
}


const files = [Bun.file('./occasions10kleboncoin.csv')]
// .then(files => console.log('files', files))
// .catch(e=> console.log('error', e))


async function parseCSV(file) {
  const text = await file.text();
  return csvParse(text);
}

const parsedFiles = await Promise.all(files.map(parseCSV));

const combinedData = parsedFiles.reduce((acc, data) => acc.concat(data), []);

const data = aq.from(combinedData);

const items = data.select(aq.names('url','url2', 'seller','description', 'price','pack','properties','year','mileage','energy','gear','address'))

const brands = ['renault', 'citroen','peugeot', 'fiat', 'dacia', 'kia', 'skoda', 'ford','mpm']

const models = {
  renault: ['zoe', 'twingo'],
  citroen: ['c1','c2','c3'],
  fiat: ['panda','ddr'],
  peugeot: ['108','208','308'],
}

const variants = {
  renault: ['twingo iii', 'twingo v'],
  citroen: ['vc1','vc2','vc3'],
  fiat: ['panda iii', 'panda 2020'],
  peugeot: ['108','208','308'],
}

const cars = items.derive({price_int: car => op.parse_int(op.replace(op.replace(car.price,'€',''), /[\s\\]/g, ''))})
.derive({description_norm: aq.escape(c => normalize_description(c.description))})
//.derive({brand: aq.escape(c => findBrandFrom (c.description_norm))})
.derive({model: car => op.slice(op.match(car.description_norm,/(\w*\s?)/),0,1)[0]})
.derive({mileage_int: car => op.parse_int(op.replace(op.replace(car.mileage,'km',''), /[\s\\]/g, ''))})
//.select('description_norm', 'brand', 'model','price_int','year', 'mileage_int')
.select('description_norm', 'model','price_int','year', 'mileage_int')
.filter(car => car.price_int)

cars.print()
exit();