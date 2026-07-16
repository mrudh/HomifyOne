const router = require('express').Router();
const { getPendingSelections, getOrderDetail, approveOrder, rejectOrder } = require('../controllers/developer.controller');
const { verifyToken, authorise } = require('../middleware/auth');

router.use(verifyToken, authorise('developer')); 
router.get('/selections/:plotId', getOrderDetail);
router.post('/selections/:plotId/approve', approveOrder);
router.post('/selections/:plotId/reject', rejectOrder);

module.exports = router;