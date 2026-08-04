const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { verifyToken, authorise } = require('../middleware/auth');

router.get('/', verifyToken, authorise('admin'), ctrl.getUsers);
router.get('/:id', verifyToken, authorise('admin'), ctrl.getUser);
router.post('/', verifyToken, authorise('admin'), ctrl.createUser);
router.patch('/:id', verifyToken, authorise('admin'), ctrl.updateUser);
router.patch('/:id/password', verifyToken, authorise('admin'), ctrl.resetPassword);
router.patch('/:id/developer', verifyToken, authorise('admin'), ctrl.reassignDeveloper);

module.exports = router;
