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

const choicesFolderMap = {
    'kitchen/choices/cabinets': {
        room: 'Kitchen',
        category: 'Kitchen Cabinets',
        subCategory: 'Cabinets'
    },
    'kitchen/choices/worktop': {
        room: 'Kitchen',
        category: 'Kitchen Worktop',
        subCategory: 'Worktop'
    },
    'kitchen/choices/splashback': {
        room: 'Kitchen',
        category: 'Kitchen Splashback',
        subCategory: 'Splashback'
    },
    'kitchen/choices/sink': {
        room: 'Kitchen',
        category: 'Kitchen Sink',
        subCategory: 'Sink'
    },
    'kitchen/choices/appliances': {
        room: 'Kitchen',
        category: 'Kitchen Appliances',
        subCategory: 'Appliances'
    },
    'bathroom/choices': {
        room: 'Bathroom',
        category: 'Bathroom',
        subCategory: 'Bathroom'
    },
    'bedroom/choices': {
        room: 'Bedroom',
        category: 'Bedroom',
        subCategory: 'Bedroom'
    },
    'living_room/choices': {
        room: 'Living Room',
        category: 'Living Room',
        subCategory: 'Living Room'
    },
    'garden/choices': {
        room: 'Garden',
        category: 'Garden',
        subCategory: 'Garden'
    },
};

const guessSubCategory = (filename, room) => {
  const f = filename.toLowerCase();

  if (room === 'Bathroom') {
    if (f.includes('tile') || f.includes('wall-tile')) return 'Tiles';
    if (f.includes('toilet') || f.includes('basin') || f.includes('wc')) return 'Sanitaryware';
    if (f.includes('shower') || f.includes('bath-screen')) return 'Shower';
    if (f.includes('mirror')) return 'Mirror';
    if (f.includes('radiator')) return 'Radiator';
    return 'Sanitaryware';
  }

  if (room === 'Bedroom') {
    if (f.includes('wall-colour') || f.includes('wall-color')) return 'Wall Colour';
    if (f.includes('blind')) return 'Blinds';
    if (f.includes('carpet')) return 'Carpet';
    if (f.includes('wardrobe')) return 'Wardrobes';
    if (f.includes('chest') || f.includes('drawer')) return 'Storage';
    if (f.includes('lighting') || f.includes('light')) return 'Lighting';
    if (f.includes('socket') || f.includes('radiator')) return 'Fixtures';
    return 'Fixtures';
  }

  if (room === 'Living Room') {
    if (f.includes('wall-paint') || f.includes('wall-pain')) return 'Wall Paint';
    if (f.includes('flooring') || f.includes('floor')) return 'Flooring';
    if (f.includes('carpet')) return 'Carpet';
    if (f.includes('ceiling-light') || f.includes('lamp')) return 'Lighting';
    if (f.includes('radiator')) return 'Radiator';
    if (f.includes('socket')) return 'Sockets & Switches';
    return 'Flooring';
  }

  if (room === 'Garden') {
    if (f.includes('fencing') || f.includes('fence')) return 'Fencing';
    if (f.includes('patio') || f.includes('paving')) return 'Patio & Paving';
    if (f.includes('wall')) return 'Garden Walls';
    if (f.includes('lawn') || f.includes('grass')) return 'Lawn';
    return 'Patio & Paving';
  }

  return null; 
};

const generateNames = async (items, retries = 3) => {
  const prompt = `You are a product naming specialist for a premium UK new-build home customisation platform called HomifyOne.

For each item below, generate:
1. A fancy short branded product name (e.g. "Riviera Wardrobe", "Oslo Extractor Hood", "Kensington Ceramic Sink")
   - Use place names, designer words, or elegant English words as prefixes
   - 2-4 words max, must clearly reflect the item type
2. A short professional one-sentence description (max 12 words)

Items (index | filename | room | subcategory):
${items.map((it, i) => `${i + 1} | ${it.filename} | ${it.room} | ${it.subCategory}`).join('\n')}

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

        if (isNotFound) {
          console.log(`\n ⚠️  ${modelName} not available, trying next...`);
          break;
        }
        if (is503 && attempt < retries) {
          const wait = attempt * 8000;
          process.stdout.write(`\n ⏳ ${modelName} busy (attempt ${attempt}/${retries}), waiting ${wait/1000}s... `);
          await new Promise(r => setTimeout(r, wait));
        } else if (attempt === retries) {
          console.log(`\n ⚠️  ${modelName} failed after ${retries} attempts, trying next...`);
          break;
        } else {
          throw err;
        }
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

const toTags = (filename, name, room, subCategory) => {
  const fromFile = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').toLowerCase().split(' ');
  const fromName = name.toLowerCase().split(' ');
  return [...new Set([...fromFile, ...fromName, room.toLowerCase(), subCategory.toLowerCase(), 'choice'])];
};

const BATCH_SIZE = 15;

const run = async () => {
  if (!GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY is missing from .env');
    process.exit(1);
  }
  console.log(`✅ Google API key found: ${GOOGLE_API_KEY.slice(0, 8)}...\n`);

  const allItems = [];
  for (const [folderPath, meta] of Object.entries(choicesFolderMap)) {
    console.log(`📁 Fetching: ${folderPath}`);
    const resources = await getAllResources(folderPath);
    console.log(` → ${resources.length} images`);
    for (const r of resources) {
      const filename = r.public_id.split('/').pop();
      const subCategory = guessSubCategory(filename, meta.room) || meta.subCategory;
      allItems.push({
        filename,
        imageUrl: r.secure_url,
        room: meta.room,
        category: meta.category,
        subCategory,
      });
    }
  }

  console.log(`\n✅ Total images found: ${allItems.length}`);
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
          description: `Standard ${item.subCategory} for your ${item.room}.`,
          category: item.category,
          room: item.room,
          subCategory: item.subCategory,
          type: 'choice',
          price: 0,
          imageUrl: item.imageUrl,
          tags: toTags(item.filename, item.filename, item.room, item.subCategory),
        });
        continue;
      }

      products.push({
        name: result.name,
        description: result.description,
        category: item.category,
        room: item.room,
        subCategory: item.subCategory,
        type: 'choice',
        price: 0,
        imageUrl: item.imageUrl,
        tags: toTags(item.filename, result.name, item.room, item.subCategory),
      });
      console.log(` ✅ ${result.name}`);
    }

    if (i + BATCH_SIZE < allItems.length) {
      process.stdout.write(` ⏳ Waiting 4s...\n`);
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  const output = `// AUTO-GENERATED — ${new Date().toISOString()} — ${products.length} products\nconst choicesProducts = ${JSON.stringify(products, null, 2)};\nmodule.exports = choicesProducts;\n`;
  fs.writeFileSync(path.join(__dirname, 'choices-products.js'), output);
  console.log(`\n🎉 Done! ${products.length} products saved to src/scripts/choices-products.js`);
};

run().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  process.exit(1);
});