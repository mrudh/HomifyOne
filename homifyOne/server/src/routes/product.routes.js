const router = require('express').Router();
const ctrl   = require('../controllers/product.controller');
const { verifyToken, authorise } = require('../middleware/auth');
const productImageUpload = require('../middleware/productImageUpload');
const Product = require('../models/Product');

router.get('/grouped', verifyToken, authorise('buyer'), ctrl.getGrouped);

router.get('/', verifyToken, authorise('admin'), ctrl.getAllProducts);
router.post('/', verifyToken, authorise('admin'), ctrl.createProduct);
router.get('/:id', verifyToken, authorise('admin'), ctrl.getProduct);
router.patch('/:id', verifyToken, authorise('admin'), ctrl.updateProduct);
router.delete('/:id', verifyToken, authorise('admin'), ctrl.deleteProduct);

router.post(
  '/:id/image',
  verifyToken,
  authorise('admin'),
  async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
      req.product = product;
      next();
    } catch (err) { next(err); }
  },
  productImageUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'An image file is required.' });
      req.product.imageUrl = req.file.path;
      await req.product.save();
      res.json({ success: true, product: req.product });
    } catch (err) { next(err); }
  }
);

module.exports = router;

