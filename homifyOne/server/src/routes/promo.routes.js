const router = require('express').Router();
const ctrl = require('../controllers/promo.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/validate', verifyToken, ctrl.validatePromo);

module.exports = router;