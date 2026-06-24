const Product = require('../models/Product');

exports.getGrouped = async (req, res, next) => {
  try {
    const products = await Product.find({ type: 'choice' }).lean();
    const grouped = {};
    for (const p of products) {
      if (!grouped[p.room]) grouped[p.room] = {};
      if (!grouped[p.room][p.subCategory]) grouped[p.room][p.subCategory] = [];
      grouped[p.room][p.subCategory].push(p);
    }
    res.json({ success: true, grouped });
  } catch (err) { next(err); }
};

exports.getAllProducts = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type)  filter.type = req.query.type;
    if (req.query.room)  filter.room = req.query.room;
    const products = await Product.find(filter).populate('supplier', 'name email').lean();
    res.json({ success: true, products });
  } catch (err) { next(err); }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier', 'name email');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, product });
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, product });
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) { next(err); }
};