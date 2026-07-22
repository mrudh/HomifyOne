const Selection = require('../models/Selection');
const Plot = require('../models/Plot');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const { cancelEvent, syncPlotDeadline } = require('../services/calendarSync.service');
const { generateSelectionSummaryPdf, getSignedSummaryUrl } = require('../services/pdfSummary.service');
const { notify } = require('../services/notification.service');

const shortRef = (id) => `#${String(id).slice(-6).toUpperCase()}`;

exports.getMySelections = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });
    const selections = await Selection.find({ plot: plot._id }).populate('products');
    res.json({ success: true, selections });
  } catch (err) { next(err); }
};

exports.getPendingSelections = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });
    const selections = await Selection.find({ plot: plot._id, status: { $ne: 'confirmed' } }).populate('products');
    res.json({ success: true, selections });
  } catch (err) { 
    next(err); 
  }
};

exports.getApprovedSpend = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });
    const approvedOrders = await Order.find({ plot: plot._id, status: 'approved' });
    const approvedSpend = approvedOrders.reduce((sum, o) => sum + (o.pricing?.finalTotal || 0), 0);
    res.json({ success: true, approvedSpend });
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

    const pendingOrder = await Order.findOne({ plot: plot._id, status: 'submitted' });
    if (pendingOrder) {
      return res.status(409).json({
        success: false,
        message: 'You already have selections awaiting developer review. Please wait for a decision before submitting more.',
      });
    }

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
          status: { $in: ['selections_submitted', 'selections_approved', 'completed'] },
        });
        if (priorOrder) {
          return res.status(409).json({ success: false, message: 'This reward is only valid on your first order.' });
        }
      }

      promo.usedAt = new Date();
      await promo.save();
    }

   
    let effectivePricing = pricing || {};
    if (creditApplied > 0) {
      const buyer = await User.findById(req.user._id).select('credit');
      const actualCredit = buyer?.credit || 0;
      const validCredit = Math.min(Number(creditApplied) || 0, actualCredit);

      if (validCredit < Number(creditApplied)) {
        const shortfall = Number(creditApplied) - validCredit;
        effectivePricing = {
          ...effectivePricing,
          credit: validCredit,
          finalTotal: (effectivePricing.finalTotal || 0) + shortfall,
        };
      }

      if (validCredit > 0) {
        await User.findByIdAndUpdate(req.user._id, { credit: 0 });
      }
    }

    const order = await Order.create({
      plot: plot._id,
      buyer: req.user._id,
      items: items || [],
      pricing: effectivePricing,
    });

    await Selection.updateMany({ plot: plot._id }, { status: 'confirmed' });
    await Plot.findByIdAndUpdate(plot._id, { status: 'selections_submitted' });
    await Selection.updateMany({ plot: plot._id }, { status: 'confirmed' });
    await Plot.findByIdAndUpdate(plot._id, { status: 'selections_submitted' });

    notify({
      recipient: plot.developer,
      type: 'order_submitted',
      title: 'New selections submitted',
      message: `${req.user.name} submitted selections for Plot ${plot.plotNumber} (order ${shortRef(order._id)}).`,
      link: '/developer/orders',
    });

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

exports.getDeveloperApprovedSummaries = async (req, res, next) => {
  try {
    const plots = await Plot.find({ developer: req.user._id }).select('_id plotNumber development');
    const plotIds = plots.map(p => p._id);
    const orders = await Order.find({ plot: { $in: plotIds }, status: 'approved' })
      .populate('buyer', 'name email')
      .populate('plot', 'plotNumber development')
      .sort({ createdAt: -1 });

    const byPlot = new Map();
    for (const order of orders) {
      const key = String(order.plot._id);
      if (!byPlot.has(key)) {
        byPlot.set(key, { plot: order.plot, orders: [] });
      }
      byPlot.get(key).orders.push(order);
    }

    res.json({ success: true, groups: Array.from(byPlot.values()) });
  } catch (err) { next(err); }
};

exports.approveOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('plot').populate('buyer');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (String(order.plot.developer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised for this order.' });
    }

    order.status = 'approved';

    const pdfUrl = await generateSelectionSummaryPdf({
      ...order.toObject(),
      developer: { name: req.user.name },
    });
    order.summaryPdf = { url: pdfUrl, generatedAt: new Date() };

    await order.save();
    await Plot.findByIdAndUpdate(order.plot._id, { status: 'selections_approved' });
    await cancelEvent('plot_deadline', order.plot._id);

    const names = order.items.map(i => i.name);
    const products = await Product.find({ name: { $in: names } });
    const productByName = new Map(products.map(p => [p.name, p]));

    const groupedBySupplier = new Map();
    const unmatchedItems = [];

    for (const item of order.items) {
      const product = productByName.get(item.name);
      if (!product) { unmatchedItems.push(item); continue; }

      const supplierId = String(product.supplier);
      if (!groupedBySupplier.has(supplierId)) groupedBySupplier.set(supplierId, []);
      groupedBySupplier.get(supplierId).push({
        product: product._id,
        name: item.name,
        price: item.price,
        room: item.room || '',
        category: item.category,
        quantity: 1,
      });
    }

    const purchaseOrders = [];
    for (const [supplierId, items] of groupedBySupplier.entries()) {
      const totalCost = items.reduce((sum, i) => sum + (i.price || 0), 0);
      const po = await PurchaseOrder.create({
        plot: order.plot._id,
        developer: req.user._id,
        supplier: supplierId,
        items,
        totalCost,
      });
      purchaseOrders.push(po);
    }
    
    notify({
      recipient: order.buyer._id,
      type: 'order_approved',
      title: 'Your selections were approved',
      message: `Your order ${shortRef(order._id)} for Plot ${order.plot.plotNumber} has been approved.`,
      link: '/buyer/orders',
    });

    purchaseOrders.forEach(po => {
      notify({
        recipient: po.supplier,
        type: 'purchase_order_created',
        title: 'New purchase order received',
        message: `New purchase order ${shortRef(po._id)} (£${po.totalCost.toLocaleString()}) created for Plot ${order.plot.plotNumber}.`,
        link: `/supplier/purchase-orders/${po._id}`,
      });
    });

    res.json({ success: true, order, purchaseOrders, unmatchedItems: unmatchedItems.map(i => i.name) });
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

    const updatedPlot = await Plot.findByIdAndUpdate(order.plot._id, {
      status: 'selections_rejected',
      rejectionReason: reason.trim(),
      deadline: newDeadline,
      deadlineRemindersSent: [],
      overdueFlagged: false,
    }, { new: true });

    await syncPlotDeadline(updatedPlot);
    
    notify({
      recipient: order.buyer,
      type: 'order_rejected',
      title: 'Changes needed to your selections',
      message: `Order ${shortRef(order._id)} for Plot ${order.plot.plotNumber}: ${reason.trim()}`,
      link: '/buyer/basket',
    });
    
    res.json({ success: true, order });
  } catch (err) { next(err); }
};


exports.getOrderSummaryPdf = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const isOwner = String(order.buyer) === String(req.user._id);
    const plot = await Plot.findById(order.plot);
    const isDeveloper = plot && String(plot.developer) === String(req.user._id);
    if (!isOwner && !isDeveloper) return res.status(403).json({ message: 'Not authorised.' });

    if (!order.summaryPdf?.generatedAt) return res.status(404).json({ message: 'Summary not generated yet.' });

    const signedUrl = await getSignedSummaryUrl(order._id);
    res.redirect(signedUrl);
  } catch (err) { next(err); }
};


exports.regenerateSummaryPdf = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('plot').populate('buyer');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.plot.developer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorised.' });
    }

    const pdfUrl = await generateSelectionSummaryPdf({
      ...order.toObject(),
      developer: { name: req.user.name },
    });
    order.summaryPdf = { url: pdfUrl, generatedAt: new Date() };
    await order.save();

    res.json({ success: true, order });
  } catch (err) { next(err); }
};