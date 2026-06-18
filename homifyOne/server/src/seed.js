const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Plot = require('./models/Plot');
const Product = require('./models/Product');
require('dotenv').config();

const userData = [
  { name: 'Alicia Hill',      email: 'aliciahill2026@gmail.com',   password: 'Test1234!', role: 'buyer' },
  { name: 'James Carter',     email: 'jamescarter2026@gmail.com',  password: 'Test1234!', role: 'buyer' },
  { name: 'Dana Robert',      email: 'dana.homifyone@gmail.com',   password: 'Test1234!', role: 'developer' },
  { name: 'Kitchen Wizards',  email: 'kitchenwizard80@gmail.com',  password: 'Test1234!', role: 'supplier' },
  { name: 'Floor & More',     email: 'floorandmore@gmail.com',     password: 'Test1234!', role: 'supplier' },
  { name: 'Bath Studio',      email: 'bathstudio@gmail.com',       password: 'Test1234!', role: 'supplier' },
  { name: 'Admin HomifyOne',  email: 'admin.homifyone@gmail.com',  password: 'Test1234!', role: 'admin' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    await Promise.all([
      User.deleteMany({}),
      Plot.deleteMany({}),
      Product.deleteMany({})
    ]);
    console.log('🗑️  Cleared users, plots, products\n');

    const createdUsers = {};
    for (const u of userData) {
      const hashed = await bcrypt.hash(u.password, 12);
      const user = await User.findOneAndUpdate(
        { email: u.email },
        { name: u.name, email: u.email, passwordHash: hashed, role: u.role, isActive: true },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      createdUsers[u.role] = createdUsers[u.role] || user; 
      createdUsers[u.email] = user;
      console.log(`User [${u.role}]: ${u.email}`);
    }

    const developer  = createdUsers['dana.homifyone@gmail.com'];
    const buyer1     = createdUsers['aliciahill2026@gmail.com'];
    const buyer2     = createdUsers['jamescarter2026@gmail.com'];
    const supplierK  = createdUsers['kitchenwizard80@gmail.com'];
    const supplierF  = createdUsers['floorandmore@gmail.com'];
    const supplierB  = createdUsers['bathstudio@gmail.com'];

    console.log('\n Seeding plots...');
    const plots = await Plot.insertMany([
      {
        developer: developer._id,
        buyer: buyer1._id,
        plotNumber: 'P101',
        address: '12 Maple Close, Leicester, LE1 2AB',
        development: 'Maple Gardens',
        coordinates: { lat: 52.6369, lng: -1.1398 },
        bedrooms: 3, bathrooms: 2,
        selectionDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        status: 'assigned'
      },
      {
        developer: developer._id,
        buyer: buyer2._id,
        plotNumber: 'P102',
        address: '14 Maple Close, Leicester, LE1 2AB',
        development: 'Maple Gardens',
        coordinates: { lat: 52.6371, lng: -1.1401 },
        bedrooms: 4, bathrooms: 3,
        selectionDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
        status: 'assigned'
      },
      {
        developer: developer._id,
        buyer: null,
        plotNumber: 'P103',
        address: '16 Maple Close, Leicester, LE1 2AB',
        development: 'Maple Gardens',
        coordinates: { lat: 52.6373, lng: -1.1404 },
        bedrooms: 2, bathrooms: 1,
        status: 'available'
      }
    ]);
    console.log(` ${plots.length} plots created`);

    console.log('\n Seeding products...');

    const products = [
//kitchen choices
      {
        name: 'Shaker White Kitchen Units',
        description: 'Classic white shaker-style kitchen cabinets with soft-close hinges.',
        supplier: supplierK._id, category: 'Kitchen', room: 'Kitchen',
        type: 'choice', price: 0,
        tags: ['kitchen', 'white', 'classic', 'shaker', 'traditional'],
        imageUrl: ''
      },
      {
        name: 'Gloss Grey Kitchen Units',
        description: 'High-gloss grey handleless kitchen units with integrated LED lighting.',
        supplier: supplierK._id, category: 'Kitchen', room: 'Kitchen',
        type: 'choice', price: 0,
        tags: ['kitchen', 'grey', 'modern', 'gloss', 'handleless', 'contemporary'],
        imageUrl: ''
      },
      {
        name: 'Anthracite Matt Kitchen Units',
        description: 'Deep anthracite matt finish cabinets for a bold, modern kitchen.',
        supplier: supplierK._id, category: 'Kitchen', room: 'Kitchen',
        type: 'choice', price: 0,
        tags: ['kitchen', 'dark', 'bold', 'modern', 'anthracite', 'matt'],
        imageUrl: ''
      },

//kitchen extras
      {
        name: 'Quartz Worktop Upgrade',
        description: 'Premium Calacatta quartz worktop with waterfall edge detail.',
        supplier: supplierK._id, category: 'Kitchen', room: 'Kitchen',
        type: 'extra', price: 2400,
        tags: ['kitchen', 'worktop', 'quartz', 'premium', 'luxury', 'marble-effect'],
        imageUrl: ''
      },
      {
        name: 'Kitchen Island Addition',
        description: 'Freestanding central kitchen island with breakfast bar overhang.',
        supplier: supplierK._id, category: 'Kitchen', room: 'Kitchen',
        type: 'extra', price: 3200,
        tags: ['kitchen', 'island', 'social', 'entertaining', 'breakfast bar', 'open plan'],
        imageUrl: ''
      },
      {
        name: 'Integrated Wine Cooler',
        description: 'Under-counter integrated wine cooler, 45-bottle capacity.',
        supplier: supplierK._id, category: 'Kitchen', room: 'Kitchen',
        type: 'extra', price: 850,
        tags: ['kitchen', 'wine', 'entertaining', 'luxury', 'appliance'],
        imageUrl: ''
      },

// bathroom choices
      {
        name: 'White Ceramic Bathroom Suite',
        description: 'Standard white ceramic basin, WC, and bath suite.',
        supplier: supplierB._id, category: 'Bathroom', room: 'Bathroom',
        type: 'choice', price: 0,
        tags: ['bathroom', 'white', 'classic', 'ceramic', 'traditional'],
        imageUrl: ''
      },
      {
        name: 'Contemporary Grey Bathroom Suite',
        description: 'Stone-grey finish basin and WC with square-edge bath.',
        supplier: supplierB._id, category: 'Bathroom', room: 'Bathroom',
        type: 'choice', price: 0,
        tags: ['bathroom', 'grey', 'modern', 'contemporary', 'stone'],
        imageUrl: ''
      },

// bathroom extras
      {
        name: 'Walk-In Rainfall Shower',
        description: 'Frameless walk-in shower enclosure with ceiling-mounted rainfall head.',
        supplier: supplierB._id, category: 'Bathroom', room: 'Bathroom',
        type: 'extra', price: 1800,
        tags: ['bathroom', 'shower', 'rainfall', 'luxury', 'spa', 'premium', 'frameless'],
        imageUrl: ''
      },
      {
        name: 'Heated Towel Rail',
        description: 'Chrome ladder-style electric heated towel rail.',
        supplier: supplierB._id, category: 'Bathroom', room: 'Bathroom',
        type: 'extra', price: 320,
        tags: ['bathroom', 'towel rail', 'heated', 'chrome', 'comfort'],
        imageUrl: ''
      },
      {
        name: 'Freestanding Bathtub',
        description: 'Oval freestanding soaker bath with floor-mounted chrome taps.',
        supplier: supplierB._id, category: 'Bathroom', room: 'Bathroom',
        type: 'extra', price: 2200,
        tags: ['bathroom', 'bath', 'freestanding', 'luxury', 'spa', 'statement'],
        imageUrl: ''
      },

// flooring choices
      {
        name: 'Light Oak Engineered Wood',
        description: 'Light oak engineered hardwood flooring, 150mm wide planks.',
        supplier: supplierF._id, category: 'Flooring', room: 'Living Room',
        type: 'choice', price: 0,
        tags: ['flooring', 'wood', 'oak', 'light', 'natural', 'warm'],
        imageUrl: ''
      },
      {
        name: 'Herringbone Grey Carpet',
        description: 'Soft herringbone-weave carpet in warm grey, suitable for bedrooms.',
        supplier: supplierF._id, category: 'Flooring', room: 'Bedroom',
        type: 'choice', price: 0,
        tags: ['flooring', 'carpet', 'grey', 'soft', 'bedroom', 'cosy', 'warm'],
        imageUrl: ''
      },
      {
        name: 'Large Format Porcelain Tiles',
        description: '600x600mm polished porcelain floor tiles in neutral cream.',
        supplier: supplierF._id, category: 'Flooring', room: 'Hallway',
        type: 'choice', price: 0,
        tags: ['flooring', 'tiles', 'porcelain', 'neutral', 'hallway', 'easy clean'],
        imageUrl: ''
      },

// flooring extras
      {
        name: 'Underfloor Heating',
        description: 'Electric underfloor heating mat with smart thermostat, per room.',
        supplier: supplierF._id, category: 'Flooring', room: 'Living Room',
        type: 'extra', price: 1200,
        tags: ['flooring', 'heating', 'underfloor', 'smart', 'comfort', 'luxury', 'warm'],
        imageUrl: ''
      },
      {
        name: 'Dark Walnut Engineered Wood',
        description: 'Rich dark walnut engineered hardwood, 180mm wide statement planks.',
        supplier: supplierF._id, category: 'Flooring', room: 'Living Room',
        type: 'extra', price: 950,
        tags: ['flooring', 'wood', 'walnut', 'dark', 'rich', 'luxury', 'statement'],
        imageUrl: ''
      },

// bedroom choices
      {
        name: 'Fitted Wardrobe — White Gloss',
        description: 'Floor-to-ceiling fitted wardrobes in white gloss with mirror doors.',
        supplier: supplierK._id, category: 'Bedroom', room: 'Master Bedroom',
        type: 'choice', price: 0,
        tags: ['bedroom', 'wardrobe', 'fitted', 'white', 'mirror', 'storage'],
        imageUrl: ''
      },
      {
        name: 'Fitted Wardrobe — Graphite Matt',
        description: 'Slim-frame fitted wardrobes in graphite matt with integrated handles.',
        supplier: supplierK._id, category: 'Bedroom', room: 'Master Bedroom',
        type: 'choice', price: 0,
        tags: ['bedroom', 'wardrobe', 'fitted', 'dark', 'graphite', 'modern', 'storage'],
        imageUrl: ''
      },

// bedroom extras
      {
        name: 'Dressing Room Conversion',
        description: 'Convert second bedroom into a walk-in dressing room with fitted units.',
        supplier: supplierK._id, category: 'Bedroom', room: 'Bedroom 2',
        type: 'extra', price: 4500,
        tags: ['bedroom', 'dressing room', 'walk-in', 'luxury', 'storage', 'premium'],
        imageUrl: ''
      },
      {
        name: 'Smart Lighting Package',
        description: 'Philips Hue smart lighting throughout — dimmable, colour-adjustable.',
        supplier: supplierK._id, category: 'Bedroom', room: 'Master Bedroom',
        type: 'extra', price: 680,
        tags: ['lighting', 'smart', 'hue', 'tech', 'modern', 'ambience', 'automated'],
        imageUrl: ''
      }
    ];

    const created = await Product.insertMany(products);
    console.log(`✅ ${created.length} products created`);

    
    console.log('\n Seed complete!');
    console.log('─────────────────────────────────────');
    console.log(' Credentials (all passwords: Test1234!)');
    console.log('   Buyer 1:    aliciahill2026@gmail.com');
    console.log('   Buyer 2:    jamescarter2026@gmail.com');
    console.log('   Developer:  dana.homifyone@gmail.com');
    console.log('   Supplier 1: kitchenwizard80@gmail.com');
    console.log('   Supplier 2: floorandmore@gmail.com');
    console.log('   Supplier 3: bathstudio@gmail.com');
    console.log('   Admin:      admin.homifyone@gmail.com');
    console.log('─────────────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error(' Seed failed:', err.message);
    process.exit(1);
  }
};

seed();