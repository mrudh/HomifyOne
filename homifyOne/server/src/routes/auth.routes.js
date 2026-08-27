const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { login, forgotPassword, resetPassword, logout } = require('../controllers/auth.controller');
const { verifyToken, authorise } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many login attempts. Please try again in a few minutes.' },
});

router.post('/login',
  loginLimiter,
  [
    body('email').isEmail(),
    body('password').notEmpty(),
    body('role').isIn(['buyer', 'developer', 'supplier', 'admin'])
  ],
  login
);

router.get('/me', verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get('/dev-only', verifyToken, authorise('developer'), (req, res) => {
  res.json({ success: true, message: 'Developer access confirmed.' });
});

router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  forgotPassword
);

router.post('/reset-password',
  [
    body('email').isEmail(),
    body('otp').isLength({ min: 6, max: 6 }),
    body('newPassword').isLength({ min: 8 })
  ],
  resetPassword
);

router.post('/logout', logout);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);


module.exports = router;