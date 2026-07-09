require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const emailRenames = {
  'bathstudio@gmail.com': 'bathstudio80@outlook.com',
  'paintwalls@gmail.com': 'paintwalls80@outlook.com',
  'blindscurtains@gmail.com': 'blindscurtains80@outlook.com',
  'carpetkingdom@gmail.com': 'carpetkingdom80@gmail.com',
  'luminarylights@gmail.com': 'luminarylights80@gmail.com',
  'floorandmore@gmail.com': 'floorandmore80@gmail.com',
  'radheat@gmail.com': 'radheat80@gmail.com',
  'gardenliving@gmail.com': 'gardenliving80@gmail.com',
  'homefurnishings@gmail.com': 'homefurnishings80@gmail.com',
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const [oldEmail, newEmail] of Object.entries(emailRenames)) {
    const result = await User.updateOne({ email: oldEmail }, { $set: { email: newEmail } });
    if (result.matchedCount === 0) {
      console.warn(`⚠️  No user found with email: ${oldEmail}`);
    } else {
      console.log(`✅ Renamed ${oldEmail} → ${newEmail}`);
    }
  }

  process.exit(0);
};

run().catch(err => { console.error('❌', err.message); process.exit(1); });