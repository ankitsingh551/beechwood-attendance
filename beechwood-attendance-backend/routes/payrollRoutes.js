const express = require('express');

const router = express.Router();

const {

    generateMonthlyPayroll,

    getMonthlyPayroll,

    updatePayroll

} = require('../controllers/payrollController');

const {

    protect,

    adminOnly

} = require('../middleware/authMiddleware');

// ============================================
// GENERATE PAYROLL
// ============================================

router.post(
    '/generate',
    protect,
    adminOnly,
    generateMonthlyPayroll
);

// ============================================
// GET MONTHLY PAYROLL
// ============================================

router.get(
    '/monthly',
    protect,
    adminOnly,
    getMonthlyPayroll
);

// ============================================
// UPDATE PAYROLL
// ============================================

router.put(
    '/:id',
    protect,
    adminOnly,
    updatePayroll
);

module.exports = router;