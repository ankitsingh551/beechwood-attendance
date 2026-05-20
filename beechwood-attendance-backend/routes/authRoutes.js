// routes/authRoutes.js
const { body } = require('express-validator');
const express = require('express');
const router = express.Router();
const {
    loginUser,
    adminCreateUser,
    getProfile,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
], loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Admin only routes
router.post('/admin/create-user', protect, adminOnly, adminCreateUser);
module.exports = router;