const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Plot = require('./models/Plot');
const Product = require('./models/Product');
const choicesProducts = require('./scripts/choices-products');
const extrasRaw = require('./scripts/extras-products');
require('dotenv').config();

const userData = [{
      name: 'Alicia Hill',
      email: 'aliciahill2026@gmail.com',
      password: 'Test1234!',
      role: 'buyer'
   },
   {
      name: 'James Carter',
      email: 'jamescarter2026@gmail.com',
      password: 'Test1234!',
      role: 'buyer'
   },
   {
      name: 'Dana Robert',
      email: 'dana.homifyone@gmail.com',
      password: 'Test1234!',
      role: 'developer',
      phone: '07700 900123'
   },
   {
      name: 'Kitchen Wizards',
      email: 'kitchenwizard80@gmail.com',
      password: 'Test1234!',
      role: 'supplier'
   }, {
      name: 'Bath Studio',
      email: 'bathstudio@gmail.com',
      password: 'Test1234!',
      role: 'supplier'
   }, {
      name: 'Paint & Walls Co',
      email: 'paintwalls@gmail.com',
      password: 'Test1234!',
      role: 'supplier'
   }, {
      name: 'Blinds & Curtains',
      email: 'blindscurtains@gmail.com',
      password: 'Test1234!',
      role: 'supplier'
   }, {
      name: 'Carpet Kingdom',
      email: 'carpetkingdom@gmail.com',
      password: 'Test1234!',
      role: 'supplier'
   }, {
      name: 'Luminary Lights',
      email: 'luminarylights@gmail.com',
      password: 'Test1234!',
      role: 'supplier'
   }, {
      name: 'Floor & More',
      email: 'floorandmore@gmail.com',
      password: 'Test1234!',
      role: 'supplier'
   }, {
      name: 'Rad & Heat',
      email: 'radheat@gmail.com',
      password: 'Test1234!',
      role: 'supplier'
   }, {
      name: 'Garden Living',
      email: 'gardenliving@gmail.com',
      password: 'Test1234!',
      role: 'supplier'
   },
   {
      name: 'Admin HomifyOne',
      email: 'admin.homifyone@gmail.com',
      password: 'Test1234!',
      role: 'admin'
   },
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
         const user = await User.findOneAndUpdate({
            email: u.email
         }, {
            name: u.name,
            email: u.email,
            passwordHash: hashed,
            role: u.role,
            phone: u.phone || '', 
            isActive: true
         }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
         });
         createdUsers[u.role] = createdUsers[u.role] || user;
         createdUsers[u.email] = user;
         console.log(`User [${u.role}]: ${u.email}`);
      }

      const developer = createdUsers['dana.homifyone@gmail.com'];
      const buyer1 = createdUsers['aliciahill2026@gmail.com'];
      const buyer2 = createdUsers['jamescarter2026@gmail.com'];
      const supplierKitchen = createdUsers['kitchenwizard80@gmail.com'];
      const supplierBath = createdUsers['bathstudio@gmail.com'];
      const supplierPaint = createdUsers['paintwalls@gmail.com'];
      const supplierBlinds = createdUsers['blindscurtains@gmail.com'];
      const supplierCarpet = createdUsers['carpetkingdom@gmail.com'];
      const supplierLights = createdUsers['luminarylights@gmail.com'];
      const supplierFloor = createdUsers['floorandmore@gmail.com'];
      const supplierRadiator = createdUsers['radheat@gmail.com'];
      const supplierGarden = createdUsers['gardenliving@gmail.com'];

      console.log('\n Seeding plots...');
      const plots = await Plot.insertMany([{
            developer: developer._id,
            buyer: buyer1._id,
            plotNumber: 'P101',
            address: '12 Maple Close, Leicester, LE1 2AB',
            development: 'Maple Gardens',
            houseType: '3 Bed Semi-Detached',
            floorArea: '1,100 sq ft',
            floorPlanUrl: 'https://res.cloudinary.com/duueksjoq/image/upload/v1782329612/3-bed-semi-detached_pthgny.png',
            coordinates: {
               lat: 52.6369,
               lng: -1.1398
            },
            bedrooms: 3,
            bathrooms: 2,
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            status: 'assigned',
            extrasAllowance: 5000
         },
         {
            developer: developer._id,
            buyer: buyer2._id,
            plotNumber: 'P102',
            address: '14 Maple Close, Leicester, LE1 2AB',
            development: 'Maple Gardens',
            coordinates: {
               lat: 52.6371,
               lng: -1.1401
            },
            bedrooms: 4,
            bathrooms: 3,
            deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            status: 'assigned'
         },
         {
            developer: developer._id,
            buyer: null,
            plotNumber: 'P103',
            address: '16 Maple Close, Leicester, LE1 2AB',
            development: 'Maple Gardens',
            coordinates: {
               lat: 52.6373,
               lng: -1.1404
            },
            bedrooms: 2,
            bathrooms: 1,
            status: 'available'
         }
      ]);
      console.log(` ${plots.length} plots created`);

      const getSupplier = (product) => {
         const room = product.room;
         const sub = product.subCategory?.toLowerCase() || '';

         if (room === 'Kitchen') return supplierKitchen._id;
         if (room === 'Bathroom') return supplierBath._id;
         if (room === 'Garden') return supplierGarden._id;
         if (sub.includes('wall')) return supplierPaint._id;
         if (sub.includes('blind')) return supplierBlinds._id;
         if (sub.includes('carpet')) return supplierCarpet._id;
         if (sub.includes('light') || sub.includes('socket') || sub.includes('fixture')) return supplierLights._id;
         if (sub.includes('floor') || sub.includes('flooring')) return supplierFloor._id;
         if (sub.includes('radiator')) return supplierRadiator._id;
         return supplierKitchen._id;
      };

      console.log('\n Seeding products...');
         
      const choicesWithSupplier = choicesProducts.map(p => ({
        ...p,
        supplier: getSupplier(p),
      }));
      await Product.insertMany(choicesWithSupplier);
      console.log(`✅ ${choicesWithSupplier.length} choice products seeded`);

      const supplierMap = {
         supplierKitchen, supplierBath, supplierPaint, supplierBlinds,
         supplierCarpet, supplierLights, supplierFloor, supplierRadiator, supplierGarden,
      };

      const extrasWithSupplier = extrasRaw.map(({ supplierKey, ...p }) => ({
         ...p,
         supplier: supplierMap[supplierKey]?._id || supplierKitchen._id,
      }));

      await Product.insertMany(extrasWithSupplier);
      console.log(`✅ ${extrasWithSupplier.length} extras products seeded`);
      
      console.log('\n Seed complete!');
      console.log('─────────────────────────────────────');
      console.log(' Credentials (all passwords: Test1234!)');
      console.log('   Buyer 1:    aliciahill2026@gmail.com');
      console.log('   Buyer 2:    jamescarter2026@gmail.com');
      console.log('   Developer:  dana.homifyone@gmail.com');
      console.log('   Supplier - Kitchen:   kitchenwizard80@gmail.com');
      console.log('   Supplier - Bathroom:  bathstudio@gmail.com');
      console.log('   Supplier - Paint:     paintwalls@gmail.com');
      console.log('   Supplier - Blinds:    blindscurtains@gmail.com');
      console.log('   Supplier - Carpet:    carpetkingdom@gmail.com');
      console.log('   Supplier - Lights:    luminarylights@gmail.com');
      console.log('   Supplier - Flooring:  floorandmore@gmail.com');
      console.log('   Supplier - Radiator:  radheat@gmail.com');
      console.log('   Supplier - Garden:    gardenliving@gmail.com');
      console.log('   Admin:      admin.homifyone@gmail.com');
      console.log('─────────────────────────────────────');

      process.exit(0);
   } catch (err) {
      console.error(' Seed failed:', err.message);
      process.exit(1);
   }

   


};

seed();