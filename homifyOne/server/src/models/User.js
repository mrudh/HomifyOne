const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  passwordHash:    { type: String, required: true },
  role:            { type: String, enum: ['buyer','developer','supplier','admin'], required: true },
  assignedDeveloper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedPlot:    { type: mongoose.Schema.Types.ObjectId, ref: 'Plot' },
  isActive:        { type: Boolean, default: true },
  otpCode:         String,
  otpExpires:      Date,
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otpCode;
  delete obj.otpExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);