const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({

    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    month: {
        type: Number,
        required: true
    },

    year: {
        type: Number,
        required: true
    },

    expectedHours: Number,
    workedHours: Number,

    grossSalary: Number,
    earnedSalary: Number,

    tdsPercentage: Number,
    tdsAmount: Number,

    netSalary: Number,
        paymentStatus: {
        type: String,
        enum: ['PAID', 'UNPAID'],
        default: 'UNPAID'
    },

    remarks: {
        type: String,
        default: ''
    },

    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

    }, {
        timestamps: true
    });

// ============================================
// PREVENT DUPLICATE PAYROLL
// ONE EMPLOYEE = ONE PAYROLL PER MONTH
// ============================================

payrollSchema.index(
    {
        employeeId: 1,
        month: 1,
        year: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model('Payroll', payrollSchema);