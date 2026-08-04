const User = require('../models/User');
const Plot = require('../models/Plot');

const ROLES = ['buyer', 'developer', 'supplier', 'admin'];

exports.getUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) { next(err); }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      passwordHash: password,
      role,
    });

    res.status(201).json({ success: true, user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (email !== undefined) patch.email = email.toLowerCase();
    if (phone !== undefined) patch.phone = phone;

    const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.passwordHash = password;
    await user.save();

    res.json({ success: true, message: 'Password updated.' });
  } catch (err) { next(err); }
};

exports.reassignDeveloper = async (req, res, next) => {
  try {
    const { developerId } = req.body;
    if (!developerId) {
      return res.status(400).json({ success: false, message: 'developerId is required.' });
    }

    const buyer = await User.findById(req.params.id);
    if (!buyer || buyer.role !== 'buyer') {
      return res.status(400).json({ success: false, message: 'Target user is not a buyer.' });
    }

    const developer = await User.findOne({ _id: developerId, role: 'developer' });
    if (!developer) {
      return res.status(400).json({ success: false, message: 'developerId does not belong to a developer account.' });
    }

    const plot = await Plot.findOneAndUpdate(
      { buyer: buyer._id },
      { developer: developer._id },
      { new: true }
    );
    if (!plot) {
      return res.status(404).json({ success: false, message: 'This buyer has no assigned plot yet, so there is no developer relationship to reassign.' });
    }

    res.json({ success: true, plot });
  } catch (err) { next(err); }
};
