const express = require('express');
const router = express.Router();

const { saveSettings, getSettings } = require('../controllers/settingsController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, adminOnly, saveSettings);
router.get('/', protect, adminOnly, getSettings);

module.exports = router;