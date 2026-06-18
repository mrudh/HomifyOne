const router = require('express').Router();
const { verifyToken, authorise } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const ctrl = require('../controllers/product.controller');

router.get('/',      verifyToken, ctrl.getProducts);
router.get('/:id',   verifyToken, ctrl.getProduct);
router.post('/',     verifyToken, authorise('admin'), upload.single('image'), ctrl.createProduct);  // ← upload added
router.patch('/:id', verifyToken, authorise('admin'), upload.single('image'), ctrl.updateProduct);  // ← upload added
router.delete('/:id',verifyToken, authorise('admin'), ctrl.deleteProduct);

module.exports = router;