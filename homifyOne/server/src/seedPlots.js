require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Plot = require('./models/Plot');
const User = require('./models/User');
const { syncPlotDeadline } = require('./services/calendarSync.service');


const DEVELOPMENTS = [
  { name: 'Maple Gardens',   street: 'Maple Close',     city: 'Leicester',  postcodeBase: 'LE1 2AB', lat: 52.6369, lng: -1.1398 },
  { name: 'Willowbrook',     street: 'Willowbrook Rise', city: 'Manchester', postcodeBase: 'M1 4BT',  lat: 53.4808, lng: -2.2426 },
  { name: 'Cedar Fields',    street: 'Cedar Fields Way', city: 'Bristol',    postcodeBase: 'BS1 5TR', lat: 51.4545, lng: -2.5879 },
  { name: 'Oakridge Park',   street: 'Oakridge Avenue',  city: 'Leeds',      postcodeBase: 'LS1 4DY', lat: 53.8008, lng: -1.5491 },
  { name: 'Birchwood Grove', street: 'Birchwood Lane',   city: 'Edinburgh',  postcodeBase: 'EH1 3AB', lat: 55.9533, lng: -3.1883 },
];

const FIRST_NAMES = ['James', 'Sophie', 'Daniel', 'Emma', 'Ryan', 'Grace', 'Liam', 'Olivia', 'Noah',
  'Ava', 'Ethan', 'Mia', 'Jack', 'Isla', 'Leo', 'Ella', 'Oscar', 'Freya', 'Harry', 'Lily', 'George', 'Chloe', 'Max', 'Zoe'];
const LAST_NAMES = ['Carter', 'Bennett', 'Foster', 'Reed', 'Cole', 'Marsh', 'Pryce', 'Doyle', 'Nash',
  'Wren', 'Blake', 'Shaw', 'Frost', 'Vance', 'Rowe', 'Cross', 'Hale', 'Dunn', 'Pike', 'Fenn', 'Snow', 'Kent', 'Voss', 'Byrne'];

const HOUSE_TYPES = [
  { type: '2 Bed Terraced',       bedrooms: 2, bathrooms: 1, floorArea: '850 sq ft' },
  { type: '3 Bed Semi-Detached',  bedrooms: 3, bathrooms: 2, floorArea: '1,100 sq ft' },
  { type: '4 Bed Detached',       bedrooms: 4, bathrooms: 3, floorArea: '1,450 sq ft' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB for plot seeding.');

  const developers = await User.find({ role: 'developer' });
  if (developers.length === 0) {
    console.error('No developer users found. Aborting.');
    process.exit(1);
  }

  const defaultPasswordHash = await bcrypt.hash('Password123!', 12);

  const TOTAL_NEW_PLOTS = 25;
  let devIndex = 0;
  let plotCounter = 104;
  let created = 0;
  let houseNumberByDev = {};

  DEVELOPMENTS.forEach(d => { houseNumberByDev[d.name] = 18; }); 
  
  for (let n = 0; n < TOTAL_NEW_PLOTS; n++) {
    const dev = DEVELOPMENTS[n % DEVELOPMENTS.length];
    const plotNumber = `P${plotCounter++}`;

    const existingPlot = await Plot.findOne({ plotNumber });
    if (existingPlot) continue;

    const assignedDeveloper = developers[devIndex % developers.length];
    devIndex++;

    const houseNumber = houseNumberByDev[dev.name];
    houseNumberByDev[dev.name] += 2;

    const houseSpec = HOUSE_TYPES[Math.floor(Math.random() * HOUSE_TYPES.length)];

    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const buyerEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${plotNumber.toLowerCase()}@example.com`;

    let buyer = await User.findOne({ email: buyerEmail });
    if (!buyer) {
      buyer = await User.create({
        name: `${firstName} ${lastName}`,
        email: buyerEmail,
        phone: '07700 900000',
        passwordHash: defaultPasswordHash,
        role: 'buyer',
        assignedDeveloper: assignedDeveloper._id,
        isActive: true,
      });
    }

    const plot = await Plot.create({
      developer: assignedDeveloper._id,
      buyer: buyer._id,
      plotNumber,
      development: dev.name,
      address: `${houseNumber} ${dev.street}, ${dev.city}, ${dev.postcodeBase}`,
      houseType: houseSpec.type,
      floorArea: houseSpec.floorArea,
      coordinates: {
        lat: dev.lat + (Math.random() - 0.5) * 0.001,
        lng: dev.lng + (Math.random() - 0.5) * 0.001,
      },
      bedrooms: houseSpec.bedrooms,
      bathrooms: houseSpec.bathrooms,
      extrasAllowance: [3000, 5000, 7500][Math.floor(Math.random() * 3)],
      status: 'assigned',
      deadline: new Date(Date.now() + (7 + Math.floor(Math.random() * 30)) * 24 * 60 * 60 * 1000),
    });

    if (plot.deadline) await syncPlotDeadline(plot);

    buyer.assignedPlot = plot._id;
    await buyer.save();

    created++;
  }

  console.log(`Seeding complete. ${created} new plots created across ${DEVELOPMENTS.length} developments.`);
  console.log(`Default buyer login password for all seeded buyers: Password123!`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});