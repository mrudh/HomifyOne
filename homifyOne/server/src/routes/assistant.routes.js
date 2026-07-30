const express = require('express');
const axios = require('axios');
const router = express.Router();
const { verifyToken, authorise } = require('../middleware/auth');
const Plot = require('../models/Plot');
const Order = require('../models/Order');
const PromoCode = require('../models/PromoCode');

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

const MAX_MESSAGE_LENGTH = 600;
const MAX_HISTORY_TURNS = 6;

async function buildBuyerContext(user, basket) {
  const context = {};

  const plot = await Plot.findOne({ buyer: user._id });
  if (plot) {
    context.plotNumber = plot.plotNumber;
    context.development = plot.development;
    context.extrasAllowance = plot.extrasAllowance;
  }

  const latestOrder = await Order.findOne({ buyer: user._id }).sort({ createdAt: -1 });
  if (latestOrder) {
    context.orderStatus = latestOrder.deliveredAt
      ? 'delivered'
      : latestOrder.status;
    context.orderTotal = latestOrder.pricing?.finalTotal;
  }

  if (user.credit > 0) context.credit = user.credit;

  if (user.promoCode) {
    const promo = await PromoCode.findById(user.promoCode);
    if (promo && !promo.usedAt) context.promoCode = promo.code;
  }

  if (Array.isArray(basket) && basket.length > 0) {
    context.basketItemCount = basket.length;
    context.basketSubtotal = basket.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
  }

  return context;
}

router.post('/chat', verifyToken, authorise('buyer'), async (req, res) => {
  try {
    let { message, history, basket } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'A message is required.' });
    }
    message = String(message).trim().slice(0, MAX_MESSAGE_LENGTH);

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-MAX_HISTORY_TURNS)
          .filter((h) => h && typeof h.content === 'string' && (h.role === 'user' || h.role === 'assistant'))
          .map((h) => ({ role: h.role, content: String(h.content).slice(0, MAX_MESSAGE_LENGTH) }))
      : [];

    const buyerContext = await buildBuyerContext(req.user, basket);

    const { data } = await axios.post(`${PYTHON_API}/assistant/chat`, {
      message,
      history: safeHistory,
      buyer_context: buyerContext,
    });

    res.json({ success: true, reply: data.reply, blocked: !!data.blocked, products: data.products || [] });
  } catch (err) {
    console.error('Assistant chat error:', err.message);
    res.status(500).json({ success: false, message: 'Assistant is unavailable right now.' });
  }
});

module.exports = router;
