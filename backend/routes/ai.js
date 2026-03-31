const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  generateDescription,
  chatbot,
  getRecommendations,
  generateAnnouncement
} = require('../controllers/aiController');

router.post('/generate',   authenticate, generateDescription);
router.post('/chat',       chatbot);
router.get('/recommend',   authenticate, getRecommendations);
router.post('/announce',   authenticate, generateAnnouncement);

module.exports = router;