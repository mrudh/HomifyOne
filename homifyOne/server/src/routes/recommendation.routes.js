const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

router.post('/recommend', async (req, res) => {
  try {
    const { data } = await axios.post(`${PYTHON_API}/recommend`, req.body);
    res.json(data);
  } catch (err) {
    console.error('Recommendation engine error:', err.message);
    res.status(500).json({ error: 'Recommendation engine unavailable' });
  }
});

router.post('/understand', async (req, res) => {
  try {
    const { data } = await axios.post(`${PYTHON_API}/understand`, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Understand endpoint unavailable' });
  }
});

module.exports = router;