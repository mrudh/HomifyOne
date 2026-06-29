const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['buyer','developer','supplier','admin'], required: true },
  assignedDeveloper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedPlot: { type: mongoose.Schema.Types.ObjectId, ref: 'Plot' },
  isActive: { type: Boolean, default: true },
  otp: { type: String },
  otpExpiry: { type: Date },
  questionnaireCompleted: {
        type: Boolean,
        default: false
    },
    questionnaireAnswers: {
        type: Object,
        default: null
    },
    buyerProfile: {
        type: String,
        default: ""
    },
    credit: {
        type: Number,
        default: 0
    },
    promoCode: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PromoCode",
        default: null
    },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  if (this.passwordHash.startsWith('$2b$')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.otp;
    delete ret.otpExpiry;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);