const router = require('express').Router();
const ctrl = require('../controllers/plot.controller');
const Plot = require('../models/Plot');
const { verifyToken, authorise } = require('../middleware/auth');
const { syncPlotDeadline } = require('../services/calendarSync.service');

router.post('/', verifyToken, authorise('developer'), ctrl.createPlot);
router.get('/my', verifyToken, authorise('buyer'), ctrl.getMyPlot);
router.get('/developer', verifyToken, authorise('developer'), ctrl.getMyPlots);
router.patch('/:id/assign-buyer', verifyToken, authorise('admin'), ctrl.assignBuyer);
router.patch('/:id/allowance', verifyToken, authorise('developer'), ctrl.setAllowance);
router.post('/:id/delivery-update', verifyToken, authorise('developer'), ctrl.sendDeliveryUpdate);
router.patch('/:id/deadline', verifyToken, authorise('developer'), async (req, res, next) => {
  try {
    const plot = await Plot.findOneAndUpdate(
      { _id: req.params.id, developer: req.user._id },
      { deadline: req.body.deadline, deadlineRemindersSent: [], overdueFlagged: false },
      { new: true }
    );
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found.' });

    await syncPlotDeadline(plot);
    res.status(200).json({ success: true, plot });
  } catch (err) { next(err); }
});
module.exports = router;