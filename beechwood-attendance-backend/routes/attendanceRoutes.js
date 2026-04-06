// routes/attendanceRoutes.js - Attendance Routes

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    markCheckIn,
    markCheckOut,
    unmarkAttendance,
    getMyAttendance,
    adminMarkAttendance,
    getEmployeeAttendance,
    getMonthlySummary,
    getMyMonthlySummary
} = require('../controllers/attendanceController');

// Employee routes
router.post('/checkin', protect, markCheckIn);
router.post('/checkout', protect, markCheckOut);
router.delete('/unmark', protect, unmarkAttendance);
router.get('/my-attendance', protect, getMyAttendance);
router.get('/my-summary', protect, getMyMonthlySummary);

// Admin routes
router.post('/admin-mark', protect, adminOnly, adminMarkAttendance);
router.get('/employee/:employeeId', protect, adminOnly, getEmployeeAttendance);
router.get('/monthly-summary', protect, adminOnly, getMonthlySummary);

module.exports = router;