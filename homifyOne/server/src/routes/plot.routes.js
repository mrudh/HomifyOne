const router = require('express').Router();
const ctrl = require('../controllers/plot.controller');
const { verifyToken, authorise } = require('../middleware/auth');

router.post('/', verifyToken, authorise('developer'), ctrl.createPlot);
router.get('/my', verifyToken, authorise('buyer'), ctrl.getMyPlot);
router.get('/developer', verifyToken, authorise('developer'), ctrl.getMyPlots);
router.patch('/:id/assign-buyer', verifyToken, authorise('admin'), ctrl.assignBuyer);
router.patch('/:id/deadline', verifyToken, authorise('developer'), ctrl.setDeadline);

module.exports = router;