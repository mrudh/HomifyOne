const router = require('express').Router();
const { body } = require('express-validator');
const { login, forgotPassword, resetPassword, logout } = require('../controllers/auth.controller');
const { verifyToken, authorise } = require('../middleware/auth');


router.post('/login',
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