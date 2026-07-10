const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');
const { verifyToken, authorise } = require('../middleware/auth');

router.get('/developer/all', verifyToken, authorise('developer'), async (req, res) => {
  try {
    const filter = { developer: req.user._id };
    if (req.query.plotId) filter.plot = req.query.plotId;
    if (req.query.status) filter.status = req.query.status;

    const orders = await PurchaseOrder.find(filter)
      .populate('plot', 'plotNumber development address')
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
    const order = await PurchaseOrder.findOne({ _id: req.params.id, supplier: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status === 'pending') {
      order.status = 'acknowledged';
      order.acknowledgedAt = new Date();
      await order.save();
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
    const order = await PurchaseOrder.findOne({ _id: req.params.id, supplier: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/eta', verifyToken, authorise('supplier'), async (req, res) => {
  try {
    const { eta } = req.body;
    if (!eta) return res.status(400).json({ message: 'ETA date required' });

    const order = await PurchaseOrder.findOne({ _id: req.params.id, supplier: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.eta = new Date(eta);
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;