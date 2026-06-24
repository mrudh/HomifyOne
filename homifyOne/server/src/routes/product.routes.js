const router = require('express').Router();
const ctrl   = require('../controllers/product.controller');
const { verifyToken, authorise } = require('../middleware/auth');

// Buyer — grouped choices for the portal
router.get('/grouped', verifyToken, authorise('buyer'), ctrl.getGrouped);

// Admin — full CRUD
router.get('/', verifyToken, authorise('admin'), ctrl.getAllProducts);
router.post('/', verifyToken, authorise('admin'), ctrl.createProduct);
router.get('/:id', verifyToken, authorise('admin'), ctrl.getProduct);
router.patch('/:id', verifyToken, authorise('admin'), ctrl.updateProduct);
router.delete('/:id', verifyToken, authorise('admin'), ctrl.deleteProduct);

module.exports = router;

