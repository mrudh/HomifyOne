const Plot = require('../models/Plot');
const User = require('../models/User');

exports.getAllPlots = async (req, res, next) => {
  try {
    const plots = await Plot.find({})
      .populate('buyer', 'name email')
      .populate('developer', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, plots });
  } catch (err) { next(err); }
};

exports.getPlotForBuyer = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ buyer: req.params.buyerId })
      .populate('buyer', 'name email')
      .populate('developer', 'name email');
    res.json({ success: true, plot: plot || null });
  } catch (err) { next(err); }
};

exports.upsertPlotForBuyer = async (req, res, next) => {
  try {
    const { buyerId } = req.params;
    const buyer = await User.findById(buyerId);
    if (!buyer || buyer.role !== 'buyer') {
      return res.status(404).json({ success: false, message: 'Buyer not found.' });
    }

    const { developer, plotNumber, address, development, houseType, bedrooms, bathrooms, floorArea, extrasAllowance } = req.body;
    if (!developer || !plotNumber || !address || !development) {
      return res.status(400).json({
        success: false,
        message: 'Developer, plot number, address and development are required.',
      });
    }

    const dev = await User.findById(developer);
    if (!dev || dev.role !== 'developer') {
      return res.status(400).json({ success: false, message: 'Selected developer is invalid.' });
    }

    const plot = await Plot.findOneAndUpdate(
      { buyer: buyer._id },
      {
        $set: {
          buyer: buyer._id,
          developer,
          plotNumber,
          address,
          development,
          houseType: houseType || '',
          bedrooms: Number(bedrooms) || 0,
          bathrooms: Number(bathrooms) || 0,
          floorArea: floorArea || '',
          extrasAllowance: extrasAllowance === undefined || extrasAllowance === '' ? 0 : Number(extrasAllowance) || 0,
        },
        $setOnInsert: { status: 'assigned' },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate('buyer', 'name email').populate('developer', 'name email');

    res.json({ success: true, plot });
  } catch (err) { next(err); }
};