require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'];

const extrasFolderMap = {
  'kitchen/extras/classic':       { room: 'Kitchen',        category: 'Kitchen',                style: 'classic' },
  'kitchen/extras/minimalistic':  { room: 'Kitchen',        category: 'Kitchen',                style: 'minimalistic' },
  'kitchen/extras/bohemian':      { room: 'Kitchen',        category: 'Kitchen',                style: 'bohemian' },
  'kitchen/extras/modern':        { room: 'Kitchen',        category: 'Kitchen',                style: 'modern' },
  'kitchen/extras/cosy':          { room: 'Kitchen',        category: 'Kitchen',                style: 'cosy' },
  'kitchen/extras/scandinavian':  { room: 'Kitchen',        category: 'Kitchen',                style: 'scandinavian' },

  'bathroom/extras/classic':      { room: 'Bathroom',       category: 'Bathroom',               style: 'classic' },
  'bathroom/extras/minimalistic': { room: 'Bathroom',       category: 'Bathroom',               style: 'minimalistic' },
  'bathroom/extras/bohemian':     { room: 'Bathroom',       category: 'Bathroom',               style: 'bohemian' },
  'bathroom/extras/modern':       { room: 'Bathroom',       category: 'Bathroom',               style: 'modern' },
  'bathroom/extras/cosy':         { room: 'Bathroom',       category: 'Bathroom',               style: 'cosy' },
  'bathroom/extras/scandinavian': { room: 'Bathroom',       category: 'Bathroom',               style: 'scandinavian' },

  'bedroom/extras/classic':       { room: 'Master Bedroom', category: 'Bedroom',                style: 'classic' },
  'bedroom/extras/minimalistic':  { room: 'Master Bedroom', category: 'Bedroom',                style: 'minimalistic' },
  'bedroom/extras/bohemian':      { room: 'Master Bedroom', category: 'Bedroom',                style: 'bohemian' },
  'bedroom/extras/modern':        { room: 'Master Bedroom', category: 'Bedroom',                style: 'modern' },
  'bedroom/extras/cosy':          { room: 'Master Bedroom', category: 'Bedroom',                style: 'cosy' },
  'bedroom/extras/scandinavian':  { room: 'Master Bedroom', category: 'Bedroom',                style: 'scandinavian' },

  'living_room/extras/classic':      { room: 'Living Room', category: 'Living Room',            style: 'classic' },
  'living_room/extras/minimalistic': { room: 'Living Room', category: 'Living Room',            style: 'minimalistic' },
  'living_room/extras/bohemian':     { room: 'Living Room', category: 'Living Room',            style: 'bohemian' },
  'living_room/extras/modern':       { room: 'Living Room', category: 'Living Room',            style: 'modern' },
  'living_room/extras/cosy':         { room: 'Living Room', category: 'Living Room',            style: 'cosy' },
  'living_room/extras/scandinavian': { room: 'Living Room', category: 'Living Room',            style: 'scandinavian' },

  'garden/extras/classic':       { room: 'Garden', category: 'Garden',                          style: 'classic' },
  'garden/extras/minimalistic':  { room: 'Garden', category: 'Garden',                          style: 'minimalistic' },
  'garden/extras/bohemian':      { room: 'Garden', category: 'Garden',                          style: 'bohemian' },
  'garden/extras/modern':        { room: 'Garden', category: 'Garden',                          style: 'modern' },
  'garden/extras/cosy':          { room: 'Garden', category: 'Garden',                          style: 'cosy' },
  'garden/extras/scandinavian':  { room: 'Garden', category: 'Garden',                          style: 'scandinavian' },

  'smart_home_and_security/extras/classic':      { room: 'Living Room', category: 'Smart Home & Security', style: 'classic' },
  'smart_home_and_security/extras/minimalistic': { room: 'Living Room', category: 'Smart Home & Security', style: 'minimalistic' },
  'smart_home_and_security/extras/modern':       { room: 'Living Room', category: 'Smart Home & Security', style: 'modern' },
};

const guessSubCategory = (filename, room) => {
  const f = filename.toLowerCase();

  if (room === 'Kitchen') {
    if (f.includes('cabinet') || f.includes('unit'))                                    return 'Cabinets';
    if (f.includes('worktop'))                                                           return 'Worktop';
    if (f.includes('splashback'))                                                        return 'Splashback';
    if (f.includes('dishwasher'))                                                        return 'Appliances';
    if (f.includes('fridge') || f.includes('freezer'))                                  return 'Appliances';
    if (f.includes('oven') || f.includes('microwave') || f.includes('stove') || f.includes('hob')) return 'Appliances';
    if (f.includes('coffee') || f.includes('toaster') || f.includes('kettle') || f.includes('mixer')) return 'Appliances';
    if (f.includes('tap') || f.includes('sink'))                                         return 'Sink & Taps';
    if (f.includes('light') || f.includes('exhaust') || f.includes('hood'))             return 'Lighting & Extraction';
    if (f.includes('bin') || f.includes('pull-out') || f.includes('pantry') || f.includes('bottle')) return 'Storage & Organisation';
    if (f.includes('plant'))                                                             return 'Decor';
    if (f.includes('washer') || f.includes('dryer'))                                    return 'Appliances';
    return 'Cabinets';
  }

  if (room === 'Bathroom') {
    if (f.includes('tile') || f.includes('tiling'))                                     return 'Tiles';
    if (f.includes('shower') || f.includes('rainfall'))                                 return 'Shower';
    if (f.includes('bath') || f.includes('tub'))                                        return 'Bath';
    if (f.includes('toilet') || f.includes('seat'))                                     return 'Sanitaryware';
    if (f.includes('towel') || f.includes('rail'))                                      return 'Towel Rail';
    if (f.includes('mirror') || f.includes('cabinet') || f.includes('storage'))        return 'Storage & Mirrors';
    if (f.includes('utility') || f.includes('accessor'))                               return 'Accessories';
    if (f.includes('screen'))                                                           return 'Bath Screen';
    if (f.includes('underfloor') || f.includes('heating'))                             return 'Underfloor Heating';
    return 'Accessories';
  }

  if (room === 'Master Bedroom') {
    if (f.includes('wardrobe'))                                                         return 'Wardrobes';
    if (f.includes('blind'))                                                            return 'Blinds';
    if (f.includes('carpet'))                                                           return 'Carpet';
    if (f.includes('wall-colour') || f.includes('wall-color') || f.includes('wall-paint')) return 'Wall Colour';
    if (f.includes('light') || f.includes('lamp') || f.includes('spotlight'))          return 'Lighting';
    if (f.includes('socket') || f.includes('switch'))                                  return 'Sockets & Switches';
    if (f.includes('radiator'))                                                         return 'Radiator';
    if (f.includes('nightstand') || f.includes('bedside'))                             return 'Furniture';
    if (f.includes('desk') || f.includes('study') || f.includes('work'))               return 'Desk & Workspace';
    if (f.includes('chest') || f.includes('drawer'))                                   return 'Furniture';
    if (f.includes('gaming'))                                                           return 'Gaming & Entertainment';
    if (f.includes('kids'))                                                             return 'Kids Furniture';
    return 'Furniture';
  }

  if (room === 'Living Room') {
    if (f.includes('carpet') || f.includes('rug') || f.includes('fur'))                return 'Carpet & Rugs';
    if (f.includes('tv') || f.includes('media') || f.includes('shelf') || f.includes('unit')) return 'TV & Media Units';
    if (f.includes('wall-paint') || f.includes('wall-colour') || f.includes('art'))    return 'Wall Paint & Art';
    if (f.includes('radiator'))                                                         return 'Radiator';
    if (f.includes('spotlight') || f.includes('light'))                                return 'Lighting';
    if (f.includes('thermostat') || f.includes('smart'))                               return 'Smart Home';
    if (f.includes('dimmer') || f.includes('switch'))                                  return 'Switches';
    if (f.includes('gaming') || f.includes('game') || f.includes('console'))          return 'Gaming & Entertainment';
    if (f.includes('work') || f.includes('desk') || f.includes('station'))             return 'Desk & Workspace';
    return 'Furniture & Decor';
  }

  if (room === 'Garden') {
    if (f.includes('fencing') || f.includes('fence'))                                  return 'Fencing';
    if (f.includes('patio') || f.includes('paving'))                                   return 'Patio & Paving';
    if (f.includes('gate') || f.includes('shed'))                                      return 'Gates & Sheds';
    if (f.includes('light') || f.includes('lamp') || f.includes('lantern'))            return 'Outdoor Lighting';
    if (f.includes('grass') || f.includes('turf') || f.includes('lawn'))              return 'Lawn & Turf';
    if (f.includes('storage'))                                                          return 'Garden Storage';
    if (f.includes('play') || f.includes('kids'))                                      return 'Play Areas';
    if (f.includes('plant') || f.includes('wall-plant'))                               return 'Planting & Decor';
    if (f.includes('vertical') || f.includes('farming'))                               return 'Vertical Gardening';
    return 'Garden Features';
  }

  if (room === 'Smart Home & Security') {
    if (f.includes('camera'))                                                           return 'Security Cameras';
    if (f.includes('thermostat'))                                                       return 'Smart Thermostat';
    if (f.includes('speaker') || f.includes('alexa') || f.includes('echo'))           return 'Smart Speakers';
    if (f.includes('light'))                                                            return 'Smart Lighting';
    if (f.includes('switch') || f.includes('security'))                               return 'Security & Control';
    if (f.includes('monitor'))                                                          return 'Monitoring';
    return 'Smart Devices';
  }

  return 'General';
};

const guessPrice = (filename, subCategory, room) => {
  const price = (min, max) => Math.round((Math.random() * (max - min) + min) / 5) * 5;

  if (room === 'Kitchen') {
    if (subCategory === 'Worktop')                  return price(900, 2800);
    if (subCategory === 'Cabinets')                 return price(800, 2600);
    if (subCategory === 'Splashback')               return price(280, 600);
    if (subCategory === 'Appliances')               return price(300, 1500);
    if (subCategory === 'Lighting & Extraction')    return price(250, 750);
    if (subCategory === 'Storage & Organisation')   return price(200, 480);
    if (subCategory === 'Sink & Taps')              return price(300, 950);
    return price(200, 800);
  }
  if (room === 'Bathroom') {
    if (subCategory === 'Shower')                   return price(350, 1900);
    if (subCategory === 'Bath')                     return price(800, 3500);
    if (subCategory === 'Tiles')                    return price(300, 1100);
    if (subCategory === 'Towel Rail')               return price(200, 400);
    if (subCategory === 'Storage & Mirrors')        return price(280, 650);
    if (subCategory === 'Underfloor Heating')       return price(600, 900);
    return price(80, 350);
  }
  if (room === 'Master Bedroom') {
    if (subCategory === 'Wardrobes')                return price(900, 3200);
    if (subCategory === 'Carpet')                   return price(500, 900);
    if (subCategory === 'Blinds')                   return price(150, 450);
    if (subCategory === 'Wall Colour')              return price(80, 160);
    if (subCategory === 'Lighting')                 return price(120, 420);
    if (subCategory === 'Furniture')                return price(200, 550);
    if (subCategory === 'Desk & Workspace')         return price(350, 680);
    if (subCategory === 'Radiator')                 return price(280, 520);
    if (subCategory === 'Sockets & Switches')       return price(110, 220);
    return price(100, 400);
  }
  if (room === 'Living Room') {
    if (subCategory === 'TV & Media Units')         return price(500, 1200);
    if (subCategory === 'Carpet & Rugs')            return price(350, 1100);
    if (subCategory === 'Radiator')                 return price(320, 750);
    if (subCategory === 'Lighting')                 return price(150, 450);
    if (subCategory === 'Wall Paint & Art')         return price(80, 420);
    if (subCategory === 'Smart Home')               return price(180, 380);
    if (subCategory === 'Desk & Workspace')         return price(420, 800);
    return price(100, 600);
  }
  if (room === 'Garden') {
    if (subCategory === 'Patio & Paving')           return price(1800, 4200);
    if (subCategory === 'Fencing')                  return price(600, 1200);
    if (subCategory === 'Gates & Sheds')            return price(500, 1600);
    if (subCategory === 'Lawn & Turf')              return price(800, 2200);
    if (subCategory === 'Outdoor Lighting')         return price(70, 200);
    if (subCategory === 'Garden Storage')           return price(250, 650);
    if (subCategory === 'Play Areas')               return price(1200, 2800);
    return price(80, 600);
  }
  if (room === 'Smart Home & Security') {
    const f = filename.toLowerCase();
    if (f.includes('camera'))                       return price(95, 280);
    if (f.includes('thermostat'))                   return price(180, 380);
    if (f.includes('speaker') || f.includes('alexa')) return price(45, 200);
    return price(50, 350);
  }
  return price(100, 500);
};

const generateNames = async (items, retries = 3) => {
  const prompt = `You are a product naming specialist for a premium UK new-build home customisation platform called HomifyOne.

For each item below, generate:
1. A fancy short branded product name (e.g. "Riviera Wardrobe", "Oslo Extractor Hood", "Kensington Ceramic Sink")
   - Use place names, designer words, or elegant English words as prefixes
   - 2-4 words max, must clearly reflect the item type
2. A short professional one-sentence description (max 12 words)

Items (index | filename | room | subcategory | style):
${items.map((it, i) => `${i + 1} | ${it.filename} | ${it.room} | ${it.subCategory} | ${it.style}`).join('\n')}

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"index":1,"name":"...","description":"..."},...]`;

  for (const modelName of MODELS) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const content = result.response.text().trim();
        const cleaned = content.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
        return JSON.parse(cleaned);
      } catch (err) {
        const is503 = err.message.includes('503') || err.message.includes('high demand');
        const isNotFound = err.message.includes('404') || err.message.includes('not found') || err.message.includes('no longer available');
        if (isNotFound) { console.log(`\n ⚠️  ${modelName} not available, trying next...`); break; }
        if (is503 && attempt < retries) {
          const wait = attempt * 8000;
          process.stdout.write(`\n ⏳ ${modelName} busy (attempt ${attempt}/${retries}), waiting ${wait/1000}s... `);
          await new Promise(r => setTimeout(r, wait));
        } else if (attempt === retries) {
          console.log(`\n ⚠️  ${modelName} failed after ${retries} attempts, trying next...`);
          break;
        } else { throw err; }
      }
    }
  }
  throw new Error('All models failed. Try again in a few minutes.');
};

const getAllResources = async (prefix) => {
  let resources = [], nextCursor = null;
  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `homifyOne/${prefix}`,
      max_results: 500,
      next_cursor: nextCursor,
    });
    resources = resources.concat(result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);
  return resources;
};

const toTags = (filename, name, room, subCategory, style) => {
  const fromFile = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').toLowerCase().split(' ');
  const fromName = name.toLowerCase().split(' ');
  return [...new Set([...fromFile, ...fromName, room.toLowerCase(), subCategory.toLowerCase(), style, 'extra'])];
};

const getSupplierKey = (room, subCategory) => {
  if (room === 'Kitchen') {
    if (subCategory === 'Lighting & Extraction') return 'supplierLights';
    return 'supplierKitchen';
  }
  if (room === 'Bathroom') {
    if (subCategory === 'Towel Rail' || subCategory === 'Underfloor Heating') return 'supplierRadiator';
    return 'supplierBath';
  }
  if (room === 'Master Bedroom') {
    if (subCategory === 'Carpet')              return 'supplierCarpet';
    if (subCategory === 'Blinds')              return 'supplierBlinds';
    if (subCategory === 'Wall Colour')         return 'supplierPaint';
    if (subCategory === 'Lighting')            return 'supplierLights';
    if (subCategory === 'Sockets & Switches')  return 'supplierLights';
    if (subCategory === 'Radiator')            return 'supplierRadiator';
    return 'supplierKitchen';
  }
  if (room === 'Living Room') {
    if (subCategory === 'Carpet & Rugs')       return 'supplierCarpet';
    if (subCategory === 'Wall Paint & Art')    return 'supplierPaint';
    if (subCategory === 'Lighting')            return 'supplierLights';
    if (subCategory === 'Radiator')            return 'supplierRadiator';
    if (subCategory === 'Smart Home')          return 'supplierLights';
    if (subCategory === 'Switches')            return 'supplierLights';
    return 'supplierKitchen';
  }
  if (room === 'Garden') {
    if (subCategory === 'Outdoor Lighting')    return 'supplierLights';
    return 'supplierGarden';
  }
  if (room === 'Smart Home & Security')        return 'supplierLights';
  return 'supplierKitchen';
};

const BATCH_SIZE = 15;

const run = async () => {
  if (!GOOGLE_API_KEY) { console.error('❌ GOOGLE_API_KEY is missing from .env'); process.exit(1); }
  console.log(`✅ Google API key found: ${GOOGLE_API_KEY.slice(0, 8)}...\n`);

  const allItems = [];
  for (const [folderPath, meta] of Object.entries(extrasFolderMap)) {
    console.log(`📁 Fetching: ${folderPath}`);
    const resources = await getAllResources(folderPath);
    console.log(` → ${resources.length} images`);
    for (const r of resources) {
      const filename = r.public_id.split('/').pop();
      const subCategory = guessSubCategory(filename, meta.room);
      allItems.push({
        filename,
        imageUrl: r.secure_url,
        room: meta.room,
        category: meta.category,
        style: meta.style,
        subCategory,
        supplierKey: getSupplierKey(meta.room, subCategory),
      });
    }
  }

  console.log(`\n✅ Total extras images found: ${allItems.length}`);
  console.log(`🤖 Generating fancy names via Gemini in batches of ${BATCH_SIZE}...\n`);

  const products = [];
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total = Math.ceil(allItems.length / BATCH_SIZE);

    process.stdout.write(`🔄 Batch ${batchNum}/${total} (${batch.length} items)... `);
    const names = await generateNames(batch);
    console.log('✅');

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const result = names.find(n => n.index === j + 1);

      if (!result) {
        console.warn(` ⚠️  No name for index ${j + 1}, using filename`);
        products.push({
          name: item.filename.replace(/[-_]/g, ' '),
          description: `${item.style} style ${item.subCategory} for your ${item.room}.`,
          category: item.category, room: item.room, subCategory: item.subCategory,
          style: item.style, type: 'extra',
          price: guessPrice(item.filename, item.subCategory, item.room),
          supplierKey: item.supplierKey, imageUrl: item.imageUrl,
          tags: toTags(item.filename, item.filename, item.room, item.subCategory, item.style),
        });
        continue;
      }

      const price = guessPrice(item.filename, item.subCategory, item.room);
      products.push({
        name: result.name, description: result.description,
        category: item.category, room: item.room, subCategory: item.subCategory,
        style: item.style, type: 'extra', price,
        supplierKey: item.supplierKey, imageUrl: item.imageUrl,
        tags: toTags(item.filename, result.name, item.room, item.subCategory, item.style),
      });
      console.log(` ✅ ${result.name} — £${price}`);
    }

    if (i + BATCH_SIZE < allItems.length) {
      process.stdout.write(` ⏳ Waiting 4s...\n`);
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  const output = `// AUTO-GENERATED — ${new Date().toISOString()} — ${products.length} extras products\nconst extrasProducts = ${JSON.stringify(products, null, 2)};\nmodule.exports = extrasProducts;\n`;
  fs.writeFileSync(path.join(__dirname, 'extras-products.js'), output);
  console.log(`\n🎉 Done! ${products.length} extras saved to src/scripts/extras-products.js`);
};

run().catch(err => { console.error(`\n❌ Fatal error: ${err.message}`); process.exit(1); });