const Selection = require('../models/Selection');
const Plot      = require('../models/Plot');

exports.getMySelections = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });
    const selections = await Selection.find({ plot: plot._id }).populate('products');
    res.json({ success: true, selections });
  } catch (err) { next(err); }
};

exports.saveSelection = async (req, res, next) => {
  try {
    const { room, category, productId, action } = req.body;
    const plot = await Plot.findOne({ buyer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });

    let selection = await Selection.findOne({ plot: plot._id, room, category });

    if (!selection) {
      selection = new Selection({ plot: plot._id, buyer: req.user._id, room, category, products: [] });
    }

    if (action === 'remove') {
      selection.products = selection.products.filter(id => id.toString() !== productId);
    } else {
      if (!selection.products.map(id => id.toString()).includes(productId)) {
        selection.products.push(productId);
      }
    }

    await selection.save();
    await selection.populate('products');
    res.json({ success: true, selection });
  } catch (err) { next(err); }
};

exports.submitSelections = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'No plot assigned.' });
    await Selection.updateMany({ plot: plot._id }, { status: 'confirmed' });
    await Plot.findByIdAndUpdate(plot._id, { status: 'selections_submitted' });
    res.json({ success: true, message: 'Selections submitted!' });
  } catch (err) { next(err); }
};