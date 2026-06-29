const express = require("express");
const router  = express.Router();
const { verifyToken } = require("../middleware/auth");
const { submitQuestionnaire, getReward } = require("../controllers/questionnaire.controller");

router.post("/submit", verifyToken, submitQuestionnaire);
router.get("/reward",  verifyToken, getReward);

module.exports = router;