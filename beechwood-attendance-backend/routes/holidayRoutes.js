// routes/holidayRoutes.js - Holiday Routes

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    createHoliday,
    getAllHolidays,
    getUpcomingHolidays,
    updateHoliday,
    deleteHoliday
} = require('../controllers/holidayController');

// Public routes (for employees)
router.get('/upcoming', protect, getUpcomingHolidays);
router.get('/', protect, getAllHolidays);

// Admin only routes
router.post('/', protect, adminOnly, createHoliday);
router.put('/:id', protect, adminOnly, updateHoliday);
router.delete('/:id', protect, adminOnly, deleteHoliday);

module.exports = router;