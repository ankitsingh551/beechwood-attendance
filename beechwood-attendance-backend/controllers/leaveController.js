// controllers/leaveController.js

const Leave = require('../models/Leave');
const User = require('../models/User');
const Attendance = require('../models/Attendance'); 
const Settings = require('../models/Settings');

// ============================================
// 📝 REQUEST LEAVE (Employee)
// ============================================
const requestLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        const employeeId = req.user._id;

        // Validation
        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide all required fields'
            });
        }

        // Convert to Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Check if start date is before end date
        if (start > end) {
            return res.status(400).json({
                status: 'error',
                message: 'Start date cannot be after end date'
            });
        }

        // Allow past dates with a flag
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastLeave = start < today;
        
        if (isPastLeave) {
            console.log(`⚠️ Past leave request from ${req.user.email} for date: ${startDate}`);
        }

        // Calculate days count
        const diffTime = Math.abs(end - start);
        const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Check leave balance only for future leaves
        if (!isPastLeave) {
            const currentYear = new Date().getFullYear();
            const approvedLeaves = await Leave.find({
                employee: employeeId,
                status: 'APPROVED',
                startDate: {
                    $gte: new Date(`${currentYear}-01-01`),
                    $lte: new Date(`${currentYear}-12-31`)
                }
            });
            
            const settings = await Settings.findOne();

            const totalLeaves = settings?.totalAnnualLeaves || 12;

            const usedLeaves = approvedLeaves.reduce((sum, leave) => sum + leave.daysCount, 0);
            const remainingLeaves = totalLeaves - usedLeaves;
            
            if (remainingLeaves < daysCount) {
                return res.status(400).json({
                    status: 'error',
                    message: `Insufficient leave balance. Available: ${remainingLeaves}, Requested: ${daysCount}`
                });
            }
        }

        // Create leave request
        const leave = await Leave.create({
            employee: employeeId,
            leaveType,
            startDate,
            endDate,
            daysCount,
            reason,
            status: 'PENDING',
            isPastLeave: isPastLeave
        });

        await leave.populate('employee', 'firstName lastName email employeeId');

        const successMessage = isPastLeave 
            ? 'Past leave request submitted successfully! It will be reviewed by admin.' 
            : 'Leave request submitted successfully!';

        res.status(201).json({
            status: 'success',
            message: successMessage,
            data: leave
        });

    } catch (error) {
        console.error('Leave request error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// 👤 GET MY LEAVES (Employee)
const getMyLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ employee: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            status: 'success',
            data: leaves
        });

    } catch (error) {
        console.error('Get leaves error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// 👑 GET ALL LEAVES (Admin)
const getAllLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find()
            .populate('employee', 'firstName lastName email employeeId department')
            .sort({ createdAt: -1 });

        res.json({
            status: 'success',
            data: leaves
        });

    } catch (error) {
        console.error('Get all leaves error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// ✅ APPROVE LEAVE (Admin) - WITH ATTENDANCE UPDATE
const approveLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        const leave = await Leave.findById(id);
        
        if (!leave) {
            return res.status(404).json({
                status: 'error',
                message: 'Leave request not found'
            });
        }

        if (leave.status !== 'PENDING') {
            return res.status(400).json({
                status: 'error',
                message: `Leave request already ${leave.status.toLowerCase()}`
            });
        }

        // Update attendance for all dates in leave range
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        
        // Loop through each date in leave range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            // Create date at start of day for consistent comparison
            const currentDate = new Date(d);
            currentDate.setHours(0, 0, 0, 0);
            
            // Find attendance record for this date
            const attendance = await Attendance.findOne({
                employee: leave.employee,
                date: {
                    $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                    $lt: new Date(currentDate.setHours(23, 59, 59, 999))
                }
            });
            
            if (attendance) {
                // Update existing attendance to LEAVE
                attendance.status = 'LEAVE';
                attendance.checkIn = null;
                attendance.checkOut = null;
                attendance.workingHours = 0;
                attendance.remarks = `Converted to leave - Approved leave: ${leave.leaveType}`;
                await attendance.save();
                console.log(`✅ Updated attendance for ${currentDate.toISOString().split('T')[0]} to LEAVE`);
            } else {
                // Create new attendance record with LEAVE status
                await Attendance.create({
                    employee: leave.employee,
                    date: currentDate,
                    status: 'LEAVE',
                    checkIn: null,
                    checkOut: null,
                    workingHours: 0,
                    remarks: `Leave approved: ${leave.leaveType} - ${leave.reason || ''}`
                });
                console.log(`✅ Created leave attendance for ${currentDate.toISOString().split('T')[0]}`);
            }
        }

        leave.status = 'APPROVED';
        leave.approvedBy = req.user._id;
        leave.approvedAt = new Date();
        leave.rejectionReason = remarks || null;
        
        await leave.save();
        await leave.populate('employee', 'firstName lastName email employeeId');
        await leave.populate('approvedBy', 'firstName lastName email');

        res.json({
            status: 'success',
            message: 'Leave approved and attendance updated successfully',
            data: leave
        });

    } catch (error) {
        console.error('Approve leave error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// ❌ REJECT LEAVE (Admin)
const rejectLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide rejection reason'
            });
        }

        const leave = await Leave.findById(id);
        
        if (!leave) {
            return res.status(404).json({
                status: 'error',
                message: 'Leave request not found'
            });
        }

        if (leave.status !== 'PENDING') {
            return res.status(400).json({
                status: 'error',
                message: `Leave request already ${leave.status.toLowerCase()}`
            });
        }

        leave.status = 'REJECTED';
        leave.approvedBy = req.user._id;
        leave.approvedAt = new Date();
        leave.rejectionReason = reason;
        
        await leave.save();
        await leave.populate('employee', 'firstName lastName email employeeId');

        res.json({
            status: 'success',
            message: 'Leave rejected',
            data: leave
        });

    } catch (error) {
        console.error('Reject leave error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// 🗑️ CANCEL LEAVE (Employee)
const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;

        const leave = await Leave.findOne({ 
            _id: id, 
            employee: req.user._id 
        });
        
        if (!leave) {
            return res.status(404).json({
                status: 'error',
                message: 'Leave request not found'
            });
        }

        if (leave.status !== 'PENDING') {
            return res.status(400).json({
                status: 'error',
                message: `Cannot cancel ${leave.status.toLowerCase()} leave`
            });
        }

        leave.status = 'CANCELLED';
        await leave.save();

        res.json({
            status: 'success',
            message: 'Leave cancelled successfully',
            data: leave
        });

    } catch (error) {
        console.error('Cancel leave error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// 📊 LEAVE BALANCE (Calculate for employee)
const getLeaveBalance = async (req, res) => {
    try {
        const employeeId = req.user._id;

        const currentYear = new Date().getFullYear();

        const settings = await Settings.findOne();

        const totalLeaves = settings?.totalAnnualLeaves || 12;     

        const leaves = await Leave.find({
            employee: employeeId,
            status: 'APPROVED',
            startDate: {
                $gte: new Date(`${currentYear}-01-01`),
                $lte: new Date(`${currentYear}-12-31`)
            }
        });

        const usedLeaves = leaves.reduce((sum, leave) => sum + leave.daysCount, 0);
        const remainingLeaves = totalLeaves - usedLeaves;

        const pendingLeaves = await Leave.countDocuments({
            employee: employeeId,
            status: 'PENDING'
        });

        res.json({
            status: 'success',
            data: {
                totalLeaves,
                usedLeaves,
                pendingLeaves,
                remainingLeaves
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    requestLeave,
    getMyLeaves,
    getAllLeaves,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getLeaveBalance
};