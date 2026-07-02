const mongoose = require('mongoose');

const selectionSchema = new mongoose.Schema({
    plot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plot',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    room: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    status: {
        type: String,
        enum: ['pending', 'confirmed'],
        default: 'pending'
    },
    recommendations: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product' 
    }],
    questionnaireCompleted: {
        type: Boolean,
        default: false 
    }
}, {
    timestamps: true
});

selectionSchema.index({
    plot: 1,
    room: 1,
    category: 1
}, {
    unique: true
});
module.exports = mongoose.model('Selection', selectionSchema);