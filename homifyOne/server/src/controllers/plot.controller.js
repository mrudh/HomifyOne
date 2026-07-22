const Plot = require('../models/Plot');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { notify } = require('../services/notification.service');
const { sendNotificationEmail } = require('../utils/emailService');

exports.createPlot = async (req, res, next) => {
  try {
    const plot = await Plot.create({ ...req.body, developer: req.user._id });
    res.status(201).json({ success: true, plot });
  } catch (err) { next(err); }
};

exports.getMyPlots = async (req, res, next) => {
  try {
    const plots = await Plot.find({ developer: req.user._id }).populate('buyer', 'name email phone');
    res.status(200).json({ success: true, plots });
  } catch (err) { next(err); }
};

exports.getMyPlot = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.user._id })
      .populate('developer', 'name email phone');
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });
    res.json({ success: true, plot });
  } catch (err) { next(err); }
};

// Admin assigns buyer to plot
exports.assignBuyer = async (req, res, next) => {
  try {
    const { buyerId } = req.body;
    const plot = await Plot.findByIdAndUpdate(
      req.params.id,
      { buyer: buyerId, status: 'assigned' },
      { new: true }
    );
    res.status(200).json({ success: true, plot });
  } catch (err) { next(err); }
};

exports.setDeadline = async (req, res, next) => {
  try {
    const plot = await Plot.findOneAndUpdate(
      { _id: req.params.id, developer: req.user._id },
      { deadline: req.body.deadline }, 
      { new: true }
    );
    res.status(200).json({ success: true, plot });
  } catch (err) { next(err); }
};

exports.setAllowance = async (req, res, next) => {
  try {
    const { extrasAllowance } = req.body;
    const plot = await Plot.findOneAndUpdate(
      { _id: req.params.id, developer: req.user._id },
      { extrasAllowance },
      { new: true }
    );
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found.' });
    res.json({ success: true, plot });
  } catch (err) { next(err); }
};


exports.sendDeliveryUpdate = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A message is required.' });
    }

    const plot = await Plot.findOne({ _id: req.params.id, developer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found.' });
    if (!plot.buyer) return res.status(400).json({ success: false, message: 'No buyer assigned to this plot.' });

    const purchaseOrders = await PurchaseOrder.find({ plot: plot._id }, '_id');
    if (purchaseOrders.length === 0) {
      return res.status(409).json({ success: false, message: 'No purchase orders exist for this plot yet.' });
    }

    const poIds = purchaseOrders.map((po) => po._id);
    const invoicedPoIds = new Set(
      (await Invoice.find({ purchaseOrder: { $in: poIds } }).distinct('purchaseOrder')).map(String)
    );
    const allInvoiced = poIds.every((id) => invoicedPoIds.has(String(id)));
    if (!allInvoiced) {
      return res.status(409).json({
        success: false,
        message: 'Not all suppliers have submitted invoices for this plot yet.',
      });
    }

    const trimmed = message.trim();

    await notify({
      recipient: plot.buyer,
      type: 'delivery_update',
      title: 'Update from your developer',
      message: trimmed,
      link: '/buyer/dashboard',
    });

    const buyer = await User.findById(plot.buyer).select('name email');
    if (buyer?.email) {
      try {
        await sendNotificationEmail(buyer.email, buyer.name, 'Update from your developer', trimmed);
      } catch (err) {
        console.error('sendDeliveryUpdate: email failed for', buyer.email, err.message);
      }
    }

    res.json({ success: true, message: 'Update sent to buyer.' });
  } catch (err) { next(err); }
};