const router = require('express').Router();
const ctrl   = require('../controllers/selection.controller');
const { verifyToken, authorise } = require('../middleware/auth');


router.use(verifyToken);
router.get('/', authorise('buyer'), ctrl.getMySelections);
router.get('/my', authorise('buyer'), ctrl.getMySelections);
router.post('/', authorise('buyer'), ctrl.saveSelection);
router.post('/submit', authorise('buyer'), ctrl.submitSelections);

module.exports = router;