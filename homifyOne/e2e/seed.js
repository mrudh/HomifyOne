require('dotenv').config();
const path = require('path');

const SERVER_ROOT = path.resolve(__dirname, '../server');
const mongoose = require(path.join(SERVER_ROOT, 'node_modules/mongoose'));
const User = require(path.join(SERVER_ROOT, 'src/models/User'));
const Plot = require(path.join(SERVER_ROOT, 'src/models/Plot'));
const Order = require(path.join(SERVER_ROOT, 'src/models/Order'));
const PurchaseOrder = require(path.join(SERVER_ROOT, 'src/models/PurchaseOrder'));

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set. Copy e2e/.env.example to e2e/.env and fill it in first.');
    process.exit(1);
  }

  if (!/e2e|test/i.test(MONGODB_URI)) {
    console.error(
      `Refusing to seed, MONGODB_URI ("${MONGODB_URI}") doesn't look like a test database ` +
      `(expected "e2e" or "test" somewhere in it). This script deletes existing Users/Plots/` +
      `Orders in whatever database it connects to. If this really is your dedicated test ` +
      `database, rename it to include "e2e" or "test", or edit this check.`
    );
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI}`);

  await Promise.all([
    User.deleteMany({}), Plot.deleteMany({}), Order.deleteMany({}), PurchaseOrder.deleteMany({}),
  ]);
  console.log('Cleared existing Users/Plots/Orders/PurchaseOrders in the test database.');

  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'Test1234!';
  const developerPassword = process.env.E2E_DEVELOPER_PASSWORD || 'Test1234!';
  const buyerPassword = process.env.E2E_BUYER_PASSWORD || 'Test1234!';

  const admin = await User.create({
    name: 'E2E Admin', email: 'admin@e2e.test', passwordHash: adminPassword, role: 'admin',
  });

  const developer = await User.create({
    name: 'E2E Developer', email: 'developer@e2e.test', passwordHash: developerPassword, role: 'developer',
  });

  const supplierPassword = process.env.E2E_SUPPLIER_PASSWORD || process.env.E2E_BUYER_PASSWORD || 'Test1234!';
  const supplier = await User.create({
    name: 'E2E Supplier', email: 'supplier@e2e.test', passwordHash: supplierPassword, role: 'supplier',
  });


  const buyer1 = await User.create({
    name: 'E2E Buyer One', email: 'buyer1@e2e.test', passwordHash: buyerPassword, role: 'buyer',
    assignedDeveloper: developer._id,
  });
  const plot1 = await Plot.create({
    developer: developer._id, buyer: buyer1._id,
    plotNumber: 'E2E-1', address: '1 Test Street', development: 'E2E Test Gardens',
    extrasAllowance: 5000, status: 'assigned',
  });
  buyer1.assignedPlot = plot1._id;
  await buyer1.save();


  const buyer2 = await User.create({
    name: 'E2E Buyer Two', email: 'buyer2@e2e.test', passwordHash: buyerPassword, role: 'buyer',
    assignedDeveloper: developer._id,
    questionnaireCompleted: true,
    questionnaireAnswers: {
      household: 'couple',
      lifestyleTraits: ['smart_home'],
      priorities: ['comfort'],
      style: 'modern',
      budget: 'balanced',
      primaryRoom: 'Kitchen',
      roomDetails: {
        Kitchen: 'More storage',
        'Storage & wardrobes': 'General hidden storage',
      },
    },
    buyerProfile: "You're part of a couple, and your home is mainly for relaxing. "
      + "You're drawn to a modern style, working with a balanced budget.",
  });
  const plot2 = await Plot.create({
    developer: developer._id, buyer: buyer2._id,
    plotNumber: 'E2E-2', address: '2 Test Street', development: 'E2E Test Gardens',
    extrasAllowance: 5000, status: 'assigned',
  });
  buyer2.assignedPlot = plot2._id;
  await buyer2.save();


  const buyer3 = await User.create({
    name: 'E2E Buyer Three', email: 'buyer3@e2e.test', passwordHash: buyerPassword, role: 'buyer',
    assignedDeveloper: developer._id,
    questionnaireCompleted: true,
  });
  const plot3 = await Plot.create({
    developer: developer._id, buyer: buyer3._id,
    plotNumber: 'E2E-3', address: '3 Test Street', development: 'E2E Test Gardens',
    extrasAllowance: 5000, status: 'selections_submitted',
  });
  buyer3.assignedPlot = plot3._id;
  await buyer3.save();
  await Order.create({
    plot: plot3._id,
    buyer: buyer3._id,
    items: [{
      name: 'E2E Test Cabinet', category: 'Kitchen', subCategory: 'Cabinets',
      room: 'Kitchen', price: 500, type: 'standard',
    }],
    pricing: { subtotal: 500, credit: 0, discountAmount: 0, finalTotal: 500, allowance: 5000 },
    status: 'submitted',
  });


  await PurchaseOrder.create({
    plot: plot3._id,
    developer: developer._id,
    supplier: supplier._id,
    items: [{ name: 'E2E PO Cabinet', price: 500, room: 'Kitchen', category: 'Kitchen', quantity: 1 }],
    totalCost: 500,
    status: 'pending',
  });

  console.log('\nSeed complete. Test accounts (all share the passwords from your .env, '
    + `defaulting to "${buyerPassword}"/"${developerPassword}"/"${adminPassword}" if unset):`);
  console.log('admin@e2e.test (role: admin)');
  console.log('developer@e2e.test (role: developer)');
  console.log('buyer1@e2e.test (role: buyer, questionnaire NOT completed)');
  console.log('buyer2@e2e.test (role: buyer, questionnaire completed)');
  console.log('buyer3@e2e.test (role: buyer, has a submitted order awaiting review)');
  console.log('supplier@e2e.test (role: supplier, has a pending purchase order awaiting acknowledgement)');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
