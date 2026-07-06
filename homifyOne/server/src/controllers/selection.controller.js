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

exports.getDeveloperOrders = async (req, res, next) => {
  try {
    const plots = await Plot.find({ developer: req.user._id }).select('_id');
    const plotIds = plots.map(p => p._id);
    const orders = await Order.find({ plot: { $in: plotIds } })
      .populate('buyer', 'name email')
      .populate('plot', 'plotNumber development')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) { next(err); }
};

exports.approveOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('plot');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (String(order.plot.developer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised for this order.' });
    }

    order.status = 'approved';
    await order.save();

    await Plot.findByIdAndUpdate(order.plot._id, { status: 'selections_approved' });
    res.json({ success: true, order });
  } catch (err) { next(err); }
};

exports.rejectOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
    }

    const order = await Order.findById(req.params.id).populate('plot');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (String(order.plot.developer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised for this order.' });
    }

    order.status = 'rejected';
    order.rejectionReason = reason.trim();
    await order.save();   

    const newDeadline = new Date();
    newDeadline.setDate(newDeadline.getDate() + 14);

    await Plot.findByIdAndUpdate(order.plot._id, {
      status: 'selections_rejected',
      rejectionReason: reason.trim(),
      deadline: newDeadline,
    });

    //await Selection.updateMany({ plot: order.plot._id }, { status: 'pending' });  

    res.json({ success: true, order });
  } catch (err) { next(err); }
};