const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');
const { verifyToken, authorise } = require('../middleware/auth');
const { syncSupplierEta } = require('../services/calendarSync.service');
const { notify } = require('../services/notification.service');

const shortRef = (id) => `#${String(id).slice(-6).toUpperCase()}`;

router.get('/developer/all', verifyToken, authorise('developer'), async (req, res) => {
  try {
    const filter = { developer: req.user._id };
    if (req.query.plotId) filter.plot = req.query.plotId;
    if (req.query.status) filter.status = req.query.status;

    const orders = await PurchaseOrder.find(filter)
      .populate({
        path: 'plot',
        select: 'plotNumber development address buyer',
        populate: { path: 'buyer', select: 'name' },
      })
      .populate('supplier', 'name email')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/developer/:id', verifyToken, authorise('developer'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({ _id: req.params.id, developer: req.user._id })
      .populate('plot', 'plotNumber development address')
      .populate('supplier', 'name email')
      .populate('items.product', 'name imageUrl subCategory');

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', verifyToken, authorise('supplier'), async (req, res) => {
  try {
    const filter = { supplier: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const orders = await PurchaseOrder.find(filter)
      .populate('plot', 'plotNumber development address')
      .populate('developer', 'name email')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', verifyToken, authorise('supplier'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({ _id: req.params.id, supplier: req.user._id })
      .populate('plot', 'plotNumber development address')
      .populate('developer', 'name email')
      .populate('items.product', 'name imageUrl subCategory');

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/acknowledge', verifyToken, authorise('supplier'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({ _id: req.params.id, supplier: req.user._id })
      .populate('plot', 'plotNumber');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status === 'pending') {
      order.status = 'acknowledged';
      order.acknowledgedAt = new Date();
      await order.save();

      notify({
        recipient: order.developer,
        type: 'purchase_order_status_changed',
        title: 'Purchase order acknowledged',
        message: `${req.user.name} acknowledged order ${shortRef(order._id)} for Plot ${order.plot?.plotNumber || ''}.`,
        link: `/developer/purchase-orders`,
      });
    }
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/status', verifyToken, authorise('supplier'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['acknowledged', 'sent', 'fulfilled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const order = await PurchaseOrder.findOne({ _id: req.params.id, supplier: req.user._id })
      .populate('plot', 'plotNumber');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();

    notify({
      recipient: order.developer,
      type: 'purchase_order_status_changed',
      title: `Purchase order marked as ${status}`,
      message: `${req.user.name} marked order ${shortRef(order._id)} for Plot ${order.plot?.plotNumber || ''} as "${status}".`,
      link: `/developer/purchase-orders`,
    });

    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/eta', verifyToken, authorise('supplier'), async (req, res, next) => {
  try {
    const { eta } = req.body;
    if (!eta) return res.status(400).json({ message: 'ETA date required' });

    const order = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, supplier: req.user._id },
      { eta: new Date(eta) },
      { new: true },
      // { returnDocument: 'after' }
    ).populate('plot developer supplier');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    await syncSupplierEta(order);

    notify({
      recipient: order.developer._id,
      type: 'purchase_order_status_changed',
      title: 'Delivery ETA set',
      message: `${order.supplier.name} set an ETA of ${new Date(eta).toLocaleDateString('en-GB')} for order ${shortRef(order._id)}, Plot ${order.plot?.plotNumber || ''}.`,
      link: `/developer/purchase-orders`,
    });

    res.json({ order });
  } catch (err) { next(err); }
});

module.exports = router;