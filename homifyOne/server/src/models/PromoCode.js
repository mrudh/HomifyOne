const mongoose = require("mongoose");

const promoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage"
    },
    value: {
        type: Number,
        required: true
    },
    maxDiscount: {
        type: Number,
        default: 200
    },
    scope: {
        type: String,
        enum: ["first_order", "all_orders"],
        default: "first_order"
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    usedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model("PromoCode", promoCodeSchema);