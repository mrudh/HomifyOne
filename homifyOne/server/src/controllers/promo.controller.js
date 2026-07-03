const PromoCode = require('../models/PromoCode');

exports.validatePromo = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Promo code is required.' });
    }

    const promo = await PromoCode.findOne({ code: code.toUpperCase() });

    if (!promo) {
      return res.status(404).json({ success: false, message: 'Invalid or expired promo code.' });
    }

    if (promo.assignedTo && String(promo.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This code is not valid for your account.' });
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, message: 'This promo code has expired.' });
    }

    if (promo.usedAt) {
      return res.status(409).json({ success: false, message: 'This promo code has already been used.' });
    }

    if (promo.scope === 'first_order') {
      const Plot = require('../models/Plot');
      const priorOrder = await Plot.exists({
        buyer: req.user._id,
        status: { $in: ['selections_submitted', 'selections_approved', 'completed'] },
      });
      if (priorOrder) {
        return res.status(409).json({ success: false, message: 'This reward is only valid on your first order.' });
      }
    }

    res.json({
      success: true,
      code: promo.code,
      discount: promo.value,
      type: promo.type === 'percentage' ? 'percent' : 'fixed',
      maxDiscount: promo.maxDiscount || null,
      expiresAt: promo.expiresAt,
    });
  } catch (err) {
    next(err);
  }
};