const User = require("../models/User");
const PromoCode = require("../models/PromoCode");
const crypto = require("crypto");

function generateCode(prefix = "MYHOME") {
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${prefix}-${suffix}`;
}

exports.submitQuestionnaire = async (req, res, next) => {
    try {
        const {answers, buyerProfile} = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({
            message: "User not found"
        });

        if (user.questionnaireCompleted) {
            const existingPromo = await PromoCode.findById(user.promoCode);
            return res.json({
                success: true,
                alreadyCompleted: true,
                credit: user.credit,
                promoCode: existingPromo?.code || null,
            });
        }

        user.questionnaireAnswers = answers;
        user.buyerProfile = buyerProfile;
        user.questionnaireCompleted = true;

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

        res.json({
            success: true,
            credit: user.credit,
            promoCode: promo.code,
            expiresAt: promo.expiresAt,
            message: "Questionnaire complete — your credit and promo code are unlocked.",
        });
    } catch (err) {
        next(err);
    }
};

exports.getReward = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).populate("promoCode");
        if (!user) return res.status(404).json({
            message: "User not found"
        });

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