// routes/leaveRoutes.js

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    requestLeave,
    getMyLeaves,
    getAllLeaves,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getLeaveBalance
} = require('../controllers/leaveController');

// Employee routes
router.post('/request', protect, requestLeave);
router.get('/my-leaves', protect, getMyLeaves);
router.get('/balance', protect, getLeaveBalance);
router.put('/cancel/:id', protect, cancelLeave);

// Admin routes
router.get('/all', protect, adminOnly, getAllLeaves);
router.put('/approve/:id', protect, adminOnly, approveLeave);
router.put('/reject/:id', protect, adminOnly, rejectLeave);

module.exports = router;