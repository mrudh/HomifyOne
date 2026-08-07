const router = require('express').Router();
const { verifyToken, authorise } = require('../middleware/auth');
const analyticsCtrl = require('../controllers/analytics.controller');

router.get('/overview', verifyToken, authorise('admin'), analyticsCtrl.getOverview);

module.exports = router;
