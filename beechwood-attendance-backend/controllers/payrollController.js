const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// ============================================
// GENERATE MONTHLY PAYROLL
// ============================================

exports.generateMonthlyPayroll = async (req, res) => {

    try {

        const { month, year } = req.body;

        const employees = await User.find({
            role: 'employee'
        });

        const payrollData = [];

        for (const employee of employees) {

            const attendance = await Attendance.find({
                employee: employee._id,
                date: {
                    $gte: new Date(year, month - 1, 1),
                    $lt: new Date(year, month, 1)
                }
            });

            // =============================
            // TOTAL WORKING HOURS
            // =============================

            const validAttendance = attendance.filter(record =>
                ['PRESENT', 'LATE', 'HALF_DAY'].includes(record.status)
            );

            const totalWorkedHours = validAttendance.reduce((sum, record) => {
                return sum + (record.workingHours || 0);
            }, 0);

            // =============================
            // EXPECTED HOURS
            // =============================

            const totalDays = new Date(year, month, 0).getDate();

            let workingDays = 0;

            for (let day = 1; day <= totalDays; day++) {

                const currentDate = new Date(year, month - 1, day);

                const dayOfWeek = currentDate.getDay();

                // ============================================
                // SKIP SATURDAY & SUNDAY
                // ============================================

                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    continue;
                }

                workingDays++;
            }

            const expectedHours = workingDays * 8;

            // =============================
            // DEFAULT SALARY
            // =============================

            let currentSalary = employee.currentSalary || 0;

            let tdsPercentage = employee.tdsPercentage || 10;

            // =============================
            // PAYROLL CALCULATION
            // =============================

            const hourlyRate = Number(
                (currentSalary / expectedHours).toFixed(2)
            );

            const earnedSalary = Number(
                (totalWorkedHours * hourlyRate).toFixed(2)
            );

            const tdsAmount = Number(
                (earnedSalary * (tdsPercentage / 100)).toFixed(2)
            );

            const netSalary = Number(
                (earnedSalary - tdsAmount).toFixed(2)
            );

            // =============================
            // SAVE OR UPDATE PAYROLL
            // =============================

            let payroll = await Payroll.findOne({
                employeeId: employee._id,
                month,
                year
            });

            if (payroll) {

                // UPDATE EXISTING PAYROLL

                payroll.expectedHours = expectedHours;
                payroll.workedHours = totalWorkedHours;
                payroll.grossSalary = currentSalary;
                payroll.earnedSalary = earnedSalary;
                payroll.tdsPercentage = tdsPercentage;
                payroll.tdsAmount = tdsAmount;
                payroll.netSalary = netSalary;

                await payroll.save();

            } else {

                payroll = await Payroll.create({
                    employeeId: employee._id,
                    month,
                    year,
                    expectedHours,
                    workedHours: totalWorkedHours,
                    grossSalary: currentSalary,
                    earnedSalary,
                    tdsPercentage,
                    tdsAmount,
                    netSalary,

                    paymentStatus: 'UNPAID',

                    remarks: '',

                    generatedBy: req.user._id
                });
            }

            payrollData.push(payroll);
        }

        res.status(200).json({
            success: true,
            count: payrollData.length,
            data: payrollData
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET MONTHLY PAYROLL
// ============================================

exports.getMonthlyPayroll = async (req, res) => {

    try {

        const { month, year } = req.query;

        const payroll = await Payroll.find({
            month,
            year
        }).populate(
            'employeeId',
            'firstName lastName email designation'
        );

        res.status(200).json({
            success: true,
            count: payroll.length,
            data: payroll
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// UPDATE PAYROLL
// ============================================

exports.updatePayroll = async (req, res) => {

    try {

        const payroll = await Payroll.findById(req.params.id);

        if (!payroll) {

            return res.status(404).json({
                success: false,
                message: 'Payroll not found'
            });
        }

        // ============================================
        // PREVENT EDIT IF ALREADY PAID
        // ============================================

        if (payroll.paymentStatus === 'PAID') {

                // Allow ONLY remarks update

                const onlyRemarksUpdate =

                    req.body.remarks !== undefined &&

                    req.body.workedHours === undefined &&

                    req.body.grossSalary === undefined &&

                    req.body.tdsPercentage === undefined &&

                    req.body.paymentStatus === undefined;

                if (!onlyRemarksUpdate) {

                    return res.status(400).json({
                        success: false,
                        message:
                            'Paid payroll cannot be edited'
                    });
                }
            }

        // ============================================
        // UPDATE PAYROLL INPUTS
        // ============================================

        if (req.body.workedHours !== undefined) {

            payroll.workedHours =
                Number(req.body.workedHours);
        }

        if (req.body.grossSalary !== undefined) {

            payroll.grossSalary =
                Number(req.body.grossSalary);
        }

        if (req.body.tdsPercentage !== undefined) {

            payroll.tdsPercentage =
                Number(req.body.tdsPercentage);
        }

        if (req.body.paymentStatus !== undefined) {

            payroll.paymentStatus =
                req.body.paymentStatus;
        }

        if (req.body.remarks !== undefined) {

            payroll.remarks =
                req.body.remarks;
        }

        // ============================================
        // UPDATE EMPLOYEE MASTER DATA
        // ============================================

        const employee = await User.findById(
            payroll.employeeId
        );

        if (employee) {

            // Update global salary

            if (req.body.grossSalary !== undefined) {

                employee.currentSalary =
                    Number(req.body.grossSalary);
            }

            // Update global TDS

            if (req.body.tdsPercentage !== undefined) {

                employee.tdsPercentage =
                    Number(req.body.tdsPercentage);
            }

            await employee.save();
        }

        // ============================================
        // RECALCULATE PAYROLL
        // ============================================

        const hourlyRate = Number(
            (
                payroll.grossSalary /
                payroll.expectedHours
            ).toFixed(2)
        );

        payroll.earnedSalary = Number(
            (
                payroll.workedHours *
                hourlyRate
            ).toFixed(2)
        );

        payroll.tdsAmount = Number(
            (
                payroll.earnedSalary *
                (payroll.tdsPercentage / 100)
            ).toFixed(2)
        );

        payroll.netSalary = Number(
            (
                payroll.earnedSalary -
                payroll.tdsAmount
            ).toFixed(2)
        );

        await payroll.save();

        res.status(200).json({
            success: true,
            data: payroll
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};