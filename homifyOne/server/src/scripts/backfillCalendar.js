require('dotenv').config();
const mongoose = require('mongoose');
const Plot = require('../models/Plot');
const PurchaseOrder = require('../models/PurchaseOrder');
require('../models/User'); // registers the User schema so .populate('developer supplier') works
const { syncPlotDeadline, syncSupplierEta } = require('../services/calendarSync.service');

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Starting calendar backfill...');

  const plots = await Plot.find({ deadline: { $ne: null } });
  let plotCount = 0;
  for (const plot of plots) {
    await syncPlotDeadline(plot);
    plotCount++;
  }
  console.log(`✅ Synced ${plotCount} plot deadlines.`);

  const orders = await PurchaseOrder.find({ eta: { $ne: null } })
    .populate('plot developer supplier');
  let orderCount = 0;
  for (const order of orders) {
    await syncSupplierEta(order);
    orderCount++;
  }
  console.log(`✅ Synced ${orderCount} purchase order ETAs.`);

  console.log('Backfill complete.');
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});