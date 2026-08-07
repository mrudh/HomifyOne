const Plot = require('../models/Plot');
const Order = require('../models/Order');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Selection = require('../models/Selection');
const { notify } = require('../services/notification.service');

exports.createPlot = async (req, res, next) => {
  try {
    const plot = await Plot.create({ ...req.body, developer: req.user._id });
    res.status(201).json({ success: true, plot });
  } catch (err) { next(err); }
};

exports.getMyPlots = async (req, res, next) => {
  try {
    const plots = await Plot.find({ developer: req.user._id }).populate('buyer', 'name email phone');
    const plotIds = plots.map((p) => p._id);
    const orders = await Order.find({ plot: { $in: plotIds }, status: { $ne: 'rejected' } })
      .select('plot status deliveredAt createdAt')
      .sort({ createdAt: -1 });

    const ordersByPlot = new Map();
    orders.forEach((o) => {
      const key = String(o.plot);
      if (!ordersByPlot.has(key)) ordersByPlot.set(key, []);
      ordersByPlot.get(key).push(o);
    });

    const [anyOrders, selectedDocs] = await Promise.all([
      Order.find({ plot: { $in: plotIds } }).select('plot'),
      Selection.find({ plot: { $in: plotIds }, products: { $exists: true, $ne: [] } }).select('plot'),
    ]);
    const plotsWithActivity = new Set([
      ...anyOrders.map((o) => String(o.plot)),
      ...selectedDocs.map((s) => String(s.plot)),
    ]);

    const plotsWithOrders = plots.map((plot) => {
      const plotOrders = ordersByPlot.get(String(plot._id)) || [];
      const latestOrder = plotOrders[0] || null;
      const orderStatus = !latestOrder ? 'none' : latestOrder.deliveredAt ? 'delivered' : 'in_progress';

      const deadlinePassed = !!plot.deadline && new Date(plot.deadline) < new Date();
      const selectionsLocked = deadlinePassed && !plotsWithActivity.has(String(plot._id));

      return {
        ...plot.toObject(),
        ordersCount: plotOrders.length,
        orderStatus,
        selectionsLocked,
      };
    });

    res.status(200).json({ success: true, plots: plotsWithOrders });
  } catch (err) { next(err); }
};

exports.getMyPlot = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.user._id })
      .populate('developer', 'name email phone');
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });

    const [orderCount, hasSelectedProducts] = await Promise.all([
      Order.countDocuments({ plot: plot._id }),
      Selection.exists({ plot: plot._id, products: { $exists: true, $ne: [] } }),
    ]);
    const hasSelectionActivity = orderCount > 0 || !!hasSelectedProducts;
    const deadlinePassed = !!plot.deadline && new Date(plot.deadline) < new Date();
    const selectionsLocked = deadlinePassed && !hasSelectionActivity;

    res.json({ success: true, plot: { ...plot.toObject(), selectionsLocked } });
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

    const currentOrder = await Order.findOne({ plot: plot._id, status: 'approved' }).sort({ createdAt: -1 });
    if (!currentOrder) {
      return res.status(409).json({ success: false, message: 'No approved order exists for this plot yet.' });
    }

    let purchaseOrders = await PurchaseOrder.find({ order: currentOrder._id }, '_id');
    if (purchaseOrders.length === 0) {
      purchaseOrders = await PurchaseOrder.find({ plot: plot._id, order: null }, '_id');
    }
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

    currentOrder.deliveredAt = new Date();
    await currentOrder.save();

    await notify({
      recipient: plot.buyer,
      type: 'delivery_update',
      title: 'Update from your developer',
      message: trimmed,
      link: '/buyer/dashboard',
    });

    res.json({ success: true, message: 'Update sent to buyer.' });
  } catch (err) { next(err); }
};