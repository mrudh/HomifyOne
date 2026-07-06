const Plot = require('../models/Plot');

exports.createPlot = async (req, res, next) => {
  try {
    const plot = await Plot.create({ ...req.body, developer: req.user._id });
    res.status(201).json({ success: true, plot });
  } catch (err) { next(err); }
};

exports.getMyPlots = async (req, res, next) => {
  try {
    const plots = await Plot.find({ developer: req.user._id }).populate('buyer', 'name email phone');
    res.status(200).json({ success: true, plots });
  } catch (err) { next(err); }
};

exports.getMyPlot = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.user._id })
      .populate('developer', 'name email phone');
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });
    res.json({ success: true, plot });
  } catch (err) { next(err); }
};

// Admin assigns buyer to plot
exports.assignBuyer = async (req, res, next) => {
  try {
    const { buyerId } = req.body;
    const plot = await Plot.findByIdAndUpdate(
      req.params.id,
      { buyer: buyerId, status: 'assigned' },
      { new: true }
    );
    res.status(200).json({ success: true, plot });
  } catch (err) { next(err); }
};

exports.setDeadline = async (req, res, next) => {
  try {
    const plot = await Plot.findOneAndUpdate(
      { _id: req.params.id, developer: req.user._id },
      { deadline: req.body.deadline }, 
      { new: true }
    );
    res.status(200).json({ success: true, plot });
  } catch (err) { next(err); }
};

exports.setAllowance = async (req, res, next) => {
  try {
    const { extrasAllowance } = req.body;
    const plot = await Plot.findOneAndUpdate(
      { _id: req.params.id, developer: req.user._id },
      { extrasAllowance },
      { new: true }
    );
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found.' });
    res.json({ success: true, plot });
  } catch (err) { next(err); }
};