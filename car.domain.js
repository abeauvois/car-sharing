const brands = ['renault', 'citroen', 'peugeot', 'fiat', 'dacia', 'kia', 'skoda', 'ford', 'mpm']
  
const models = {
  renault: ['zoe', 'twingo'],
  citroen: ['c1', 'c2', 'c3'],
  fiat: ['panda'],
  peugeot: ['108', '208', '308'],
}

const variants = {
  renault: ['twingo iii', 'twingo v'],
  citroen: ['vc1', 'vc2', 'vc3'],
  fiat: ['panda iii', 'panda 2020'],
  peugeot: ['108', '208', '308'],
}

export function findBrandFrom(content){

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

export function getBrand(content){
  return brands.find(b => content.includes(b))
}

export function getBrandModel(brand, content){
  if (!models[brand]) return `unknown brand ${brand} in models`
  const found = models[brand].find((m => content.includes(m)))
  if (!found) return null
  return found
}

export function getBrandVariant(brand, content){
  if (!variants[brand]) return `unknown brand ${brand} in variants`
  const found = variants[brand].find((v => content.includes(v)))
  if (!found) return null
  return found
}
