const express = require("express");
const router  = express.Router();
const ctrl = require('../controllers/questionnaire.controller');
const { verifyToken, authorise } = require("../middleware/auth");
const { submitQuestionnaire, getReward } = require("../controllers/questionnaire.controller");

// router.post("/submit", verifyToken, submitQuestionnaire);
router.get("/reward",  verifyToken, getReward);
router.post('/submit', verifyToken, authorise('buyer'), ctrl.submitQuestionnaire);
router.get('/recommendations', verifyToken, authorise('buyer'), ctrl.getRecommendations);
module.exports = router;