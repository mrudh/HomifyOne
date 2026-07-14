const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const { syncMeeting, cancelEvent } = require('../services/calendarSync.service');
const { verifyToken, authorise } = require('../middleware/auth');

router.post('/', verifyToken, authorise('developer'), async (req, res, next) => {
  try {
    const meeting = await Meeting.create({ ...req.body, developer: req.user._id });
    await syncMeeting(meeting);
    res.status(201).json({ success: true, meeting });
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', verifyToken, async (req, res, next) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    await cancelEvent('meeting', meeting._id);
    res.json({ success: true, meeting });
  } catch (err) { next(err); }
});

module.exports = router;