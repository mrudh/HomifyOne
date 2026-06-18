const Product = require('../models/Product');

exports.createProduct = async (req, res, next) => {
  try {
    const productData = { ...req.body };
    if (req.file) productData.imageUrl = req.file.path; // Cloudinary URL
    const product = await Product.create(productData);
    res.status(201).json({ success: true, product });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.imageUrl = req.file.path; // replace image if new one uploaded
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.status(200).json({ success: true, product });
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.status(200).json({ success: true, message: 'Product deactivated.' });
  } catch (err) { next(err); }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { type, category, room, supplierId } = req.query;
    const filter = { isActive: true };
    if (type)       filter.type = type;
    if (category)   filter.category = category;
    if (room)       filter.room = room;
    if (supplierId) filter.supplier = supplierId;

    const products = await Product.find(filter).populate('supplier', 'name email');
    res.status(200).json({ success: true, count: products.length, products });
  } catch (err) { next(err); }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier', 'name email');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.status(200).json({ success: true, product });
  } catch (err) { next(err); }
};