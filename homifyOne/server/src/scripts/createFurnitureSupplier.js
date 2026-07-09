require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: 'homefurnishings@gmail.com' });
  if (existing) {
    console.log('✅ Supplier already exists:', existing._id);
    process.exit(0);
  }

  const hashed = await bcrypt.hash('Test1234!', 12);
  const supplier = await User.create({
    name: 'Home Furnishings Co',
    email: 'homefurnishings@gmail.com',
    passwordHash: hashed,
    role: 'supplier',
    isActive: true,
  });

  console.log('✅ Created supplier:', supplier._id);
  process.exit(0);
};

run().catch(err => { console.error('❌', err.message); process.exit(1); });