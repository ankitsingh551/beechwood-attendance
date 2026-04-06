// routes/employeeRoutes.js

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getAllEmployees,
    getUserById,
    addUser,
    updateUser,
    deleteUser,
    resetUserPassword
} = require('../controllers/employeeController');

// All routes require admin authentication
router.use(protect, adminOnly);

// User CRUD routes
router.get('/', getAllEmployees);
router.get('/:id', getUserById);
router.post('/', addUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/reset-password', resetUserPassword);

module.exports = router;