require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const { getSupplierKey } = require('../config/supplierMapping');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const supplierEmails = {
    supplierKitchen: 'kitchenwizard80@gmail.com',
    supplierBath: 'bathstudio80@outlook.com',
    supplierPaint: 'paintwalls80@outlook.com',
    supplierBlinds: 'blindscurtains80@outlook.com',
    supplierCarpet: 'carpetkingdom80@gmail.com',
    supplierLights: 'luminarylights80@gmail.com',
    supplierFloor: 'floorandmore80@gmail.com',
    supplierRadiator: 'radheat80@gmail.com',
    supplierGarden: 'gardenliving80@gmail.com',
    supplierFurniture: 'homefurnishings80@gmail.com',
  };

  const supplierMap = {};
  for (const [key, email] of Object.entries(supplierEmails)) {
    const user = await User.findOne({ email });
    if (!user) { console.error(`❌ Missing supplier user: ${email}`); process.exit(1); }
    supplierMap[key] = user._id;
  }

  const products = await Product.find({});
  let updated = 0;

  for (const p of products) {
    const key = getSupplierKey(p.room, p.subCategory);
    const correctSupplier = supplierMap[key];
    if (String(p.supplier) !== String(correctSupplier)) {
      p.supplier = correctSupplier;
      await p.save();
      updated++;
    }
  }

  console.log(`✅ Checked ${products.length} products, updated ${updated}`);
  process.exit(0);
};

run().catch(err => { console.error('❌', err.message); process.exit(1); });