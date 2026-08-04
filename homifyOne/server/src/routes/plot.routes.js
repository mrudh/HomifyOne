const router = require('express').Router();
const ctrl = require('../controllers/plot.controller');
const adminPlotCtrl = require('../controllers/adminPlot.controller');
const Plot = require('../models/Plot');
const { verifyToken, authorise } = require('../middleware/auth');
const { syncPlotDeadline } = require('../services/calendarSync.service');
const floorPlanUpload = require('../middleware/floorPlanUpload');

router.get('/', verifyToken, authorise('admin'), adminPlotCtrl.getAllPlots);
router.get('/buyer/:buyerId', verifyToken, authorise('admin'), adminPlotCtrl.getPlotForBuyer);
router.put('/buyer/:buyerId', verifyToken, authorise('admin'), adminPlotCtrl.upsertPlotForBuyer);
router.post(
  '/buyer/:buyerId/floorplan',
  verifyToken,
  authorise('admin'),
  floorPlanUpload.single('floorPlan'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'A floor plan image is required.' });
      const plot = await Plot.findOneAndUpdate(
        { buyer: req.params.buyerId },
        { floorPlanUrl: req.file.path },
        { new: true }
      ).populate('buyer', 'name email').populate('developer', 'name email');
      if (!plot) {
        return res.status(404).json({ success: false, message: 'Save the property details first, then upload the floor plan.' });
      }
      res.json({ success: true, plot });
    } catch (err) { next(err); }
  }
);

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