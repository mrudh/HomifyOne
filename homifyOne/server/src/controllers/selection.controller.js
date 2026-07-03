const Selection = require('../models/Selection');
const Plot      = require('../models/Plot');
const PromoCode = require('../models/PromoCode');
const User      = require('../models/User');
const Order = require('../models/Order');

exports.getMySelections = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });
    const selections = await Selection.find({ plot: plot._id }).populate('products');
    res.json({ success: true, selections });
  } catch (err) { next(err); }
};

exports.saveSelection = async (req, res, next) => {
  try {
    const { room, category, productId, action } = req.body;
    const plot = await Plot.findOne({ buyer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });

    let selection = await Selection.findOne({ plot: plot._id, room, category });

    if (!selection) {
      selection = new Selection({ plot: plot._id, buyer: req.user._id, room, category, products: [] });
    }

    if (action === 'remove') {
      selection.products = selection.products.filter(id => id.toString() !== productId);
    } else {
      if (!selection.products.map(id => id.toString()).includes(productId)) {
        selection.products.push(productId);
      }
    }

    await selection.save();
    await selection.populate('products');
    res.json({ success: true, selection });
  } catch (err) { next(err); }
};

exports.submitSelections = async (req, res, next) => {
  try {
    const { promoCode, creditApplied, items, pricing } = req.body;
    const plot = await Plot.findOne({ buyer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });

    if (promoCode) {
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase() });

      if (!promo) {
        return res.status(404).json({ success: false, message: 'Promo code not found.' });
      }
      if (promo.assignedTo && String(promo.assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'This code is not valid for your account.' });
      }
      if (promo.usedAt) {
        return res.status(409).json({ success: false, message: 'This promo code has already been used.' });
      }
      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
        return res.status(410).json({ success: false, message: 'This promo code has expired.' });
      }
      if (promo.scope === 'first_order') {
        const priorOrder = await Plot.exists({
          buyer: req.user._id,
          _id: { $ne: plot._id },
          status: { $in: ['selections_submitted', 'selections_approved', 'completed'] },
        });
        if (priorOrder) {
          return res.status(409).json({ success: false, message: 'This reward is only valid on your first order.' });
        }
      }

      promo.usedAt = new Date();
      await promo.save();
    }

    if (creditApplied > 0) {
      await User.findByIdAndUpdate(req.user._id, { credit: 0 });
    }

    const order = await Order.create({
      plot: plot._id,
      buyer: req.user._id,
      items: items || [],
      pricing: pricing || {},
    });

    await Selection.updateMany({ plot: plot._id }, { status: 'confirmed' });
    await Plot.findByIdAndUpdate(plot._id, { status: 'selections_submitted' });

    res.json({ success: true, message: 'Selections submitted!', orderId: order._id });
  } catch (err) { next(err); }
};

exports.getMyOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ buyer: req.user._id }).sort({ createdAt: -1 });
    if (!order) return res.status(404).json({ success: false, message: 'No order found.' });
    res.json({ success: true, order });
  } catch (err) { next(err); }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ buyer: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) { next(err); }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, buyer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) { next(err); }
};