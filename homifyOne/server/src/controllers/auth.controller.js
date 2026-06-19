const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { sendOTP } = require('../utils/emailService');

const signToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password, role } = req.body;
    const user = await User.findOne({ email, role, isActive: true }).select('+passwordHash');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email, password, or role.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email, password, or role.' });

    const token = signToken(user._id, user.role);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isActive: true });

    if (!user) return res.status(200).json({ success: true, message: 'If that email exists, a reset code has been sent.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    try {
      await sendOTP(user.email, user.name, otp);
      console.log(`OTP email sent to ${email}`);
    } catch (emailErr) {
      console.warn('Email failed:', emailErr.message);
      console.log(`DEV fallback OTP for ${email}: ${otp}`);
    }

    res.status(200).json({ success: true, message: 'If that email exists, a reset code has been sent.' });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      otp: otp,
      otpExpiry: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordHash: hashed }, $unset: { otp: '', otpExpiry: '' } }
    );

    res.status(200).json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) { next(err); }
};