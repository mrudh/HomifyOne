const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const Selection = require('../models/Selection');
const Plot = require('../models/Plot');
const crypto = require('crypto');

const CREDIT_RATE = 0.03;
const CREDIT_CAP = 250;
const CREDIT_FLOOR = 50;

function generateCode(prefix = 'MYHOME') {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${suffix}`;
}

function calculateCredit(extrasAllowance = 0) {
  const raw = Math.round(extrasAllowance * CREDIT_RATE);
  return Math.min(Math.max(raw, CREDIT_FLOOR), CREDIT_CAP);
}

exports.submitQuestionnaire = async (req, res, next) => {
  try {
    const { answers, buyerProfile } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    await Selection.findOneAndUpdate(
      { buyer: userId },
      { $set: { questionnaireCompleted: true } },
      { upsert: true, new: true }
    );

    if (user.questionnaireCompleted) {
      const existingPromo = await PromoCode.findById(user.promoCode);
      const priorOrder = await Plot.exists({
        buyer: userId,
        status: { $in: ['selections_submitted', 'selections_approved', 'completed'] },
      });
      return res.json({
        success: true,
        alreadyCompleted: true,
        rewardExpired: !!priorOrder || !!existingPromo?.usedAt,
        credit: user.credit,
        promoCode: existingPromo?.code || null,
        expiresAt: existingPromo?.expiresAt || null,
      });
    }

    const plot = await Plot.findOne({ buyer: userId });
    const credit = calculateCredit(plot?.extrasAllowance || 0);

    user.questionnaireAnswers = answers;
    user.buyerProfile = buyerProfile;
    user.questionnaireCompleted = true;
    user.credit = credit;

    const code = generateCode();
    const promo = await PromoCode.create({
      code,
      type: "percentage",
      value: 10,
      maxDiscount: 200,
      scope: "first_order",
      assignedTo: userId,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    user.promoCode = promo._id;
    await user.save();

    const existing = await Selection.findOne({ buyer: userId });

    if (existing) {
      existing.questionnaireCompleted = true;
      await existing.save();
    } else {
      await Selection.create({ buyer: userId, questionnaireCompleted: true });
    }

    res.json({
      success: true,
      credit: user.credit,
      promoCode: promo.code,
      expiresAt: promo.expiresAt,
      message: 'Questionnaire complete.',
    });
  } catch (err) { next(err); }
};

exports.getReward = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).populate('promoCode');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            success: true,
            questionnaireCompleted: user.questionnaireCompleted,
            credit: user.credit,
            promoCode: user.promoCode?.code || null,
            promoExpiry: user.promoCode?.expiresAt || null,
            promoUsed: !!user.promoCode?.usedAt,
        });
    } catch (err) {
        next(err);
    }
};

exports.getRecommendations = async (req, res, next) => {
  try {
    const selection = await Selection.findOne({ buyer: req.user._id });
    res.json({
      success: true,
      recommendations: selection?.recommendations || [],
      questionnaireCompleted: selection?.questionnaireCompleted || false,
    });
  } catch (err) { next(err); }
};