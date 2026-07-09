require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Order = require('../models/Order');

const PLOT_ID = '6a44537cbd0f27ab0893b195';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const oldPOs = await PurchaseOrder.find({ plot: PLOT_ID });
  if (oldPOs.length === 0) {
    console.log('No purchase orders found for this plot.');
    process.exit(0);
  }

  const developer = oldPOs[0].developer;
  const allItems = oldPOs.flatMap(po => po.items);

  const productIds = allItems.map(i => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map(p => [String(p._id), p]));

  const groupedBySupplier = new Map();
  const unmatched = [];

  for (const item of allItems) {
    const product = productById.get(String(item.product));
    if (!product) { unmatched.push(item); continue; }

    const supplierId = String(product.supplier);
    if (!groupedBySupplier.has(supplierId)) groupedBySupplier.set(supplierId, []);
    groupedBySupplier.get(supplierId).push({
      product: item.product,
      name: item.name,
      price: item.price,
      room: item.room,
      category: item.category,
      quantity: item.quantity,
    });
  }

  await PurchaseOrder.deleteMany({ plot: PLOT_ID });
  console.log(`🗑️  Deleted ${oldPOs.length} old purchase orders`);

  const newPOs = [];
  for (const [supplierId, items] of groupedBySupplier.entries()) {
    const totalCost = items.reduce((sum, i) => sum + (i.price || 0), 0);
    const po = await PurchaseOrder.create({
      plot: PLOT_ID,
      developer,
      supplier: supplierId,
      items,
      totalCost,
    });
    newPOs.push(po);
  }

  console.log(`✅ Created ${newPOs.length} corrected purchase orders`);
  if (unmatched.length) console.log(`⚠️ Unmatched items: ${unmatched.map(i => i.name).join(', ')}`);
  process.exit(0);
};

run().catch(err => { console.error('❌', err.message); process.exit(1); });