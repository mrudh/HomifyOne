const router = require('express').Router();
const ctrl   = require('../controllers/selection.controller');
const { verifyToken, authorise } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', authorise('buyer'), ctrl.getMySelections);
router.get('/my', authorise('buyer'), ctrl.getMySelections);
router.get('/pending', authorise('buyer'), ctrl.getPendingSelections);
router.get('/approved-spend', authorise('buyer'), ctrl.getApprovedSpend);
router.post('/', authorise('buyer'), ctrl.saveSelection);
router.post('/submit', authorise('buyer'), ctrl.submitSelections);
router.get('/order', authorise('buyer'), ctrl.getMyOrder);
router.get('/orders', authorise('buyer'), ctrl.getMyOrders);
router.get('/orders/:id', authorise('buyer'), ctrl.getOrderById);
router.get('/orders/:id/summary-pdf', ctrl.getOrderSummaryPdf);

router.get('/developer/orders', authorise('developer'), ctrl.getDeveloperOrders);
router.patch('/developer/orders/:id/approve', authorise('developer'), ctrl.approveOrder);
router.patch('/developer/orders/:id/reject', authorise('developer'), ctrl.rejectOrder);
router.post('/developer/orders/:id/regenerate-pdf', authorise('developer'), ctrl.regenerateSummaryPdf);
module.exports = router;