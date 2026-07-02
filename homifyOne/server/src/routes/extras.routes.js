const express = require('express');
const router  = express.Router();
const products = require('../scripts/extras-products');

router.get('/', (req, res) => {
  const { category, style } = req.query;
  let result = products;
  if (category) result = result.filter(p => p.category === category);
  if (style)    result = result.filter(p => p.style    === style);
  res.json(result);
});

router.get('/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase().replace(/-/g, ' ');
  const product = products.find(
    p => p.name.toLowerCase() === slug
  );
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

module.exports = router;