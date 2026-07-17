const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const { verifyToken, authorise } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { notify } = require('../services/notification.service');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


router.post(
  '/purchase-orders/:id/invoices',
  verifyToken,
  authorise('supplier'),
  upload.single('invoice'),
  async (req, res, next) => {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, supplier: req.user._id })
        .populate('plot', 'plotNumber');
      if (!order) return res.status(404).json({ success: false, message: 'Purchase order not found.' });

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Invoice file is required.' });
      }

      const invoice = await Invoice.create({
        purchaseOrder: order._id,
        supplier: req.user._id,
        developer: order.developer,
        fileKey: req.file.key,
        fileName: req.file.originalname,
        amount: Number(req.body.amount) || 0,
        notes: req.body.notes || '',
      });

      notify({
        recipient: order.developer,
        type: 'invoice_submitted',
        title: 'New invoice submitted',
        message: `${req.user.name} submitted an invoice (£${invoice.amount.toLocaleString()}) for order ${shortRef(order._id)}, Plot ${order.plot?.plotNumber || ''}.`,
        link: `/developer/purchase-orders`,
      });

      res.status(201).json({ success: true, invoice });
    } catch (err) { next(err); }
  }
);


router.get(
  '/invoices/:invoiceId/download',
  verifyToken,
  async (req, res, next) => {
    try {
      const invoice = await Invoice.findById(req.params.invoiceId);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

      const isOwner = invoice.supplier.toString() === req.user._id.toString();
      const isDeveloper = invoice.developer.toString() === req.user._id.toString();
      if (!isOwner && !isDeveloper) {
        return res.status(403).json({ success: false, message: 'Not authorised.' });
      }

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: invoice.fileKey,
      });

      const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // valid 5 minutes
      res.json({ success: true, url });
    } catch (err) { next(err); }
  }
);


router.get(
  '/purchase-orders/:id/invoices',
  verifyToken,
  authorise('supplier'),
  async (req, res, next) => {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, supplier: req.user._id });
      if (!order) return res.status(404).json({ success: false, message: 'Purchase order not found.' });

      const invoices = await Invoice.find({ purchaseOrder: order._id }).sort({ createdAt: -1 });
      res.json({ success: true, invoices });
    } catch (err) { next(err); }
  }
);

router.get(
  '/invoices/my',
  verifyToken,
  authorise('supplier'),
  async (req, res, next) => {
    try {
      const filter = { supplier: req.user._id };
      if (req.query.status) filter.status = req.query.status;

      const invoices = await Invoice.find(filter)
        .populate('purchaseOrder', 'totalCost status')
        .sort({ createdAt: -1 });

      res.json({ success: true, invoices });
    } catch (err) { next(err); }
  }
);

router.get(
  '/purchase-orders/:id/invoices/developer',
  verifyToken,
  authorise('developer'),
  async (req, res, next) => {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, developer: req.user._id });
      if (!order) return res.status(404).json({ success: false, message: 'Purchase order not found.' });

      const invoices = await Invoice.find({ purchaseOrder: order._id })
        .populate('supplier', 'name email')
        .sort({ createdAt: -1 });

      res.json({ success: true, invoices });
    } catch (err) { next(err); }
  }
);

router.patch(
  '/invoices/:invoiceId/status',
  verifyToken,
  authorise('developer'),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!['submitted', 'reviewed', 'paid'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
      }

      const invoice = await Invoice.findOne({ _id: req.params.invoiceId, developer: req.user._id });
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

      invoice.status = status;
      await invoice.save();

      notify({
        recipient: invoice.supplier,
        type: 'invoice_submitted',
        title: `Invoice marked as ${status}`,
        message: `Your invoice (£${invoice.amount.toLocaleString()}) for Plot ${invoice.purchaseOrder?.plot?.plotNumber || ''} has been marked as "${status}".`,
        link: '/supplier/invoices',
      });

      res.json({ success: true, invoice });
    } catch (err) { next(err); }
  }
);


router.delete(
  '/invoices/:invoiceId',
  verifyToken,
  authorise('supplier'),
  async (req, res, next) => {
    try {
      const invoice = await Invoice.findOne({ _id: req.params.invoiceId, supplier: req.user._id });
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

      if (invoice.status !== 'submitted') {
        return res.status(400).json({ success: false, message: 'Only invoices still pending review can be deleted.' });
      }

      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: invoice.fileKey,
      }));

      await invoice.deleteOne();
      res.json({ success: true, message: 'Invoice deleted.' });
    } catch (err) { next(err); }
  }
);


router.get(
  '/developer/invoices/all',
  verifyToken,
  authorise('developer'),
  async (req, res, next) => {
    try {
      const invoices = await Invoice.find({ developer: req.user._id })
        .populate('supplier', 'name email')
        .sort({ createdAt: -1 });

      res.json({ success: true, invoices });
    } catch (err) { next(err); }
  }
);
module.exports = router;