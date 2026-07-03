const router = require('express').Router();
const ctrl   = require('../controllers/selection.controller');
const { verifyToken, authorise } = require('../middleware/auth');


router.use(verifyToken);
router.get('/', authorise('buyer'), ctrl.getMySelections);
router.get('/my', authorise('buyer'), ctrl.getMySelections);
router.post('/', authorise('buyer'), ctrl.saveSelection);
router.post('/submit', authorise('buyer'), ctrl.submitSelections);
router.get('/order', authorise('buyer'), ctrl.getMyOrder);
router.get('/orders', authorise('buyer'), ctrl.getMyOrders);
router.get('/orders/:id', authorise('buyer'), ctrl.getOrderById);

module.exports = router;