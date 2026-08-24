require('dotenv').config();
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'];
const BATCH_SIZE = 10;
const REGENERATE_ALL = process.argv.includes('--all');

const generateSpecs = async (items, retries = 3) => {
  const prompt = `You are a product spec-sheet writer for a premium UK new-build home customisation platform called HomifyOne.

For each item below, generate 4-6 short, plausible specification rows (label + value) appropriate to that type of product — e.g. Material, Finish, Dimensions, Colour, Warranty, Installation. Keep values concise (a few words each).

Items (index | name | room | category | subcategory | description):
${items.map((it, i) => `${i + 1} | ${it.name} | ${it.room} | ${it.category} | ${it.subCategory} | ${it.description || ''}`).join('\n')}

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"index":1,"specifications":[{"label":"Material","value":"..."},{"label":"Finish","value":"..."}]},...]`;

  for (const modelName of MODELS) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const content = result.response.text().trim();
        const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
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
          process.stdout.write(`\n ⏳ ${modelName} busy (attempt ${attempt}/${retries}), waiting ${wait / 1000}s... `);
          await new Promise((r) => setTimeout(r, wait));
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

const run = async () => {
  if (!GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY is missing from .env');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing from .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to DB.');

  const filter = REGENERATE_ALL
    ? { type: 'choice' }
    : { type: 'choice', $or: [{ specifications: { $exists: false } }, { specifications: { $size: 0 } }] };

  const products = await Product.find(filter).select('_id name description category room subCategory');

  if (products.length === 0) {
    console.log('✅ Nothing to do — no choice products need specifications.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`🔎 ${products.length} choice product(s) to enrich${REGENERATE_ALL ? ' (--all, regenerating everything)' : ''}.\n`);

  let updated = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total = Math.ceil(products.length / BATCH_SIZE);

    process.stdout.write(`🔄 Batch ${batchNum}/${total} (${batch.length} items)... `);

    let results;
    try {
      results = await generateSpecs(batch);
    } catch (err) {
      console.log(`❌ ${err.message} — skipping this batch.`);
      continue;
    }
    console.log('✅');

    for (let j = 0; j < batch.length; j++) {
      const product = batch[j];
      const match = results.find((r) => r.index === j + 1);
      if (!match || !Array.isArray(match.specifications) || match.specifications.length === 0) {
        console.warn(` ⚠️  No specifications returned for "${product.name}", leaving unchanged.`);
        continue;
      }


      await Product.findByIdAndUpdate(product._id, { $set: { specifications: match.specifications } });
      updated++;
      console.log(`   ✅ ${product.name} — ${match.specifications.length} spec rows`);
    }

    if (i + BATCH_SIZE < products.length) {
      await new Promise((r) => setTimeout(r, 4000));
    }
  }

  console.log(`\n🎉 Done. ${updated}/${products.length} choice product(s) updated with specifications.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
