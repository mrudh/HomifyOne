const router = require('express').Router();
const { verifyToken, authorise } = require('../middleware/auth');
const ctrl = require('../controllers/plot.controller');

router.post('/',         verifyToken, authorise('developer'),        ctrl.createPlot);
router.get('/my-plots',  verifyToken, authorise('developer'),        ctrl.getMyPlots);
router.get('/my-plot',   verifyToken, authorise('buyer'),            ctrl.getMyPlot);
router.patch('/:id/assign-buyer', verifyToken, authorise('admin'),   ctrl.assignBuyer);
router.patch('/:id/deadline',     verifyToken, authorise('developer'), ctrl.setDeadline);

module.exports = router;