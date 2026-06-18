const router = require('express').Router();

//temp
router.get('/', (req, res) => res.json({ message: 'user routes' }));

module.exports = router;