const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const { verifyToken, authorise } = require('../middleware/auth');
const { generateUserFeed } = require('../services/icsExport.service');

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const query = { participants: req.user._id, status: { $ne: 'cancelled' } };
    if (from && to) query.startTime = { $gte: new Date(from), $lte: new Date(to) };

    const events = await CalendarEvent.find(query)
      .populate('plot', 'plotNumber development')
      .populate('purchaseOrder', 'totalCost')
      .sort({ startTime: 1 });

    res.json({ success: true, events });
  } catch (err) { next(err); }
});


router.get('/export.ics', verifyToken, async (req, res, next) => {
  try {
    const calendar = await generateUserFeed(req.user._id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="homifyone-calendar.ics"');
    res.send(calendar.toString());
  } catch (err) { next(err); }
});

router.get('/feed/:userId/:token', async (req, res, next) => {
  try {
    const calendar = await generateUserFeed(req.params.userId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(calendar.toString());
  } catch (err) { next(err); }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const events = await CalendarEvent.find({
      participants: req.user._id,
      status: { $ne: 'cancelled' },
    }).sort({ startTime: 1 });

    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load calendar events' });
  }
});
module.exports = router;