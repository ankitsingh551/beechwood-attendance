// controllers/attendanceController.js - Attendance Management
// Beechwood Solutions India

const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');

// ============================================
// HELPER: Check if employee is on approved leave
// ============================================
const isOnApprovedLeave = async (employeeId, date) => {
    const selectedDate = new Date(date);

    const leave = await Leave.findOne({
        employee: employeeId,
        status: 'APPROVED',
        startDate: { $lte: getEndOfDay(selectedDate) },
        endDate: { $gte: getStartOfDay(selectedDate) }
    });

    return !!leave;
};

// ============================================
// HELPER: Normalize date to start/end of day
// ============================================
const getStartOfDay = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
};

const getEndOfDay = (date) => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
};

// ============================================
// HELPER: Validate date is in current month
// ============================================
const isDateInCurrentMonth = (date) => {
    const today = new Date();
    const selectedDate = new Date(date);
    return selectedDate.getMonth() === today.getMonth() && 
           selectedDate.getFullYear() === today.getFullYear();
};

// ============================================
// HELPER: Validate date is not in future
// ============================================
const isDateNotInFuture = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate <= today;
};

// ============================================
// HELPER: Parse time string to minutes
// ============================================
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    
    // Handle formats like "09:15:23 AM" or "09:15 AM" or "09:15:23"
    const match = timeStr.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM)?/i);
    if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[4]?.toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return (hours * 60) + minutes;
    }
    return null;
};

// ============================================
// 👤 EMPLOYEE MARK ATTENDANCE (Check-in)
// ============================================
const markCheckIn = async (req, res, next) => {
    try {
        const { date, checkIn, location, remarks, isBulk } = req.body;
        const employeeId = req.user._id;
        const userRole = req.user.role;

        const selectedDate = new Date(date);

          // ✅ CORRECT PLACE
        const onLeave = await isOnApprovedLeave(employeeId, selectedDate);
        if (onLeave) {
            return res.status(400).json({
                status: 'error',
                message: 'You are on approved leave for this date. Attendance not allowed.'
            });
        }
        // Only restrict real-time employee check-in
        const isRealtimeEmployee =
            userRole === 'EMPLOYEE' && !isBulk;

        if (isRealtimeEmployee) {
            if (!isDateNotInFuture(selectedDate)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot mark attendance for future dates'
                });
            }

            if (!isDateInCurrentMonth(selectedDate)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'You can only mark attendance for the current month'
                });
            }
        }

        let attendance = await Attendance.findOne({
            employee: employeeId,
            date: {
                $gte: getStartOfDay(selectedDate),
                $lte: getEndOfDay(selectedDate)
            }
        });

        const checkInTime = checkIn || new Date().toLocaleTimeString();

        if (!attendance) {
                attendance = new Attendance({
                employee: employeeId,
                date: selectedDate,
                checkIn: checkInTime,
                location: location || {},
                remarks: remarks || '',
                markedBy: employeeId,
                isManual: !!isBulk,
                status: 'PRESENT'
            });
        } else {
            attendance.checkIn = checkInTime;
            attendance.location = location || attendance.location;
            attendance.remarks = remarks || attendance.remarks;
            attendance.isManual = !!isBulk;
        }

        await attendance.save();

        // ✅ ADD THIS BLOCK
        const io = req.app.get('io');

        if (!isBulk) {

            io.emit('attendanceUpdated', {
                employeeId,
                date: selectedDate,
                status: attendance.status,
                checkIn: attendance.checkIn,
                checkOut: attendance.checkOut,
                workingHours: attendance.workingHours,
                isBulk: !!isBulk
            });

        }

        res.status(200).json({
            status: 'success',
            message: 'Check-in successful',
            data: attendance
        });

    } catch (error) {
        console.error('Check-in error:', error);
        next(error);
    }
};

// ============================================
// 👤 EMPLOYEE MARK ATTENDANCE (Check-out)
// ============================================
const markCheckOut = async (req, res, next) => {
    try {
        const {
            date,
            checkOut,
            location,
            remarks,
            isBulk
        } = req.body;
        const employeeId = req.user._id;
        
        const selectedDate = new Date(date);
        
        // ✅ CORRECT PLACE
        const onLeave = await isOnApprovedLeave(employeeId, selectedDate);
        if (onLeave) {
            return res.status(400).json({
                status: 'error',
                message: 'You are on approved leave for this date. Cannot mark check-out.'
            });
        }
        
        // Find attendance record
        const attendance = await Attendance.findOne({
            employee: employeeId,
            date: {
                $gte: getStartOfDay(selectedDate),
                $lte: getEndOfDay(selectedDate)
            }
        });
        
        if (!attendance) {
            return res.status(404).json({
                status: 'error',
                message: 'No check-in found for this date. Please check-in first.'
            });
        }
        
        if (attendance.checkOut) {
            return res.status(400).json({
                status: 'error',
                message: 'Check-out already marked for this date'
            });
        }
        
        // Update check-out
        const checkOutTime = checkOut || new Date().toLocaleTimeString();
        attendance.checkOut = checkOutTime;
        if (location) attendance.location = location;
        if (remarks) attendance.remarks = remarks;
        
        // Calculate working hours
        if (attendance.checkIn && attendance.checkOut) {
            const checkInMinutes = parseTimeToMinutes(attendance.checkIn);
            const checkOutMinutes = parseTimeToMinutes(attendance.checkOut);
            
            if (checkInMinutes !== null && checkOutMinutes !== null) {
                let diffMinutes = checkOutMinutes - checkInMinutes;
                // Handle overnight shifts (if checkout is next day)
                if (diffMinutes < 0) diffMinutes += 24 * 60;
                const workingHours = parseFloat((diffMinutes / 60).toFixed(2));
                attendance.workingHours = workingHours > 0 ? workingHours : 0;
                
                // Update status based on working hours
                if (attendance.workingHours >= 7) {
                    attendance.status = 'PRESENT';
                } else if (attendance.workingHours >= 4) {
                    attendance.status = 'HALF_DAY';
                } else if (attendance.workingHours > 0) {
                    attendance.status = 'LATE';
                }
            }
        }
        
        await attendance.save();

        // ✅ ADD THIS BLOCK
        const io = req.app.get('io');

        if (!isBulk) {

            io.emit('attendanceUpdated', {
                employeeId,
                date: selectedDate,
                status: attendance.status,
                checkIn: attendance.checkIn,
                checkOut: attendance.checkOut,
                workingHours: attendance.workingHours,
                isBulk: !!isBulk
            });

        }

        res.status(200).json({
            status: 'success',
            message: 'Check-out successful',

            data: {
                _id: attendance._id,
                checkIn: attendance.checkIn,
                checkOut: attendance.checkOut,
                workingHours: attendance.workingHours,
                date: attendance.date,
                status: attendance.status
            }
        });
        
    } catch (error) {
        console.error('Check-out error:', error);
        next(error);
    }
};

// ============================================
// 👤 GET MY ATTENDANCE HISTORY
// ============================================
const getMyAttendance = async (req, res, next) => {
    try {
        const employeeId = req.user._id;
        const { month, year, fromDate, toDate } = req.query;
        
        let query = { employee: employeeId };
        
        if (fromDate && toDate) {
            query.date = {
                $gte: getStartOfDay(new Date(fromDate)),
                $lte: getEndOfDay(new Date(toDate))
            };
        } else if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = {
                $gte: startDate,
                $lte: getEndOfDay(endDate)
            };
        } else {
            // Default to current month
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            query.date = {
                $gte: startDate,
                $lte: getEndOfDay(endDate)
            };
        }
        
        const attendance = await Attendance.find(query).sort({ date: -1 });
        
        res.status(200).json({
            status: 'success',
            data: attendance
        });
        
    } catch (error) {
        console.error('Get attendance error:', error);
        next(error);
    }
};

// ============================================
// 👑 ADMIN: MARK ATTENDANCE FOR ANY EMPLOYEE
// ============================================
const adminMarkAttendance = async (req, res, next) => {
    try {
        const { employeeId, date, checkIn, checkOut, status, remarks } = req.body;
        
        const selectedDate = new Date(date);
        
        
        // Check if employee exists
        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                status: 'error',
                message: 'Employee not found'
            });
        }
        
        // Check if attendance already exists
        let attendance = await Attendance.findOne({
            employee: employeeId,
            date: {
                $gte: getStartOfDay(selectedDate),
                $lte: getEndOfDay(selectedDate)
            }
        });

       const allowedStatus = ['PRESENT','ABSENT','LATE','HALF_DAY','LEAVE'];

        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid status value'
            });
        }

        if (!status) {
    return res.status(400).json({
        status: 'error',
        message: 'Status is required'
    });
}
            
        if (attendance) {
            // ✅ Always update status first
            attendance.status = status;

            // ✅ FORCE overwrite (fix for Present → Absent issue)
            attendance.checkIn = checkIn ?? null;
            attendance.checkOut = checkOut ?? null;

            // ✅ Reset working hours for non-working statuses
            if (['ABSENT', 'LEAVE'].includes(status)) {
                attendance.workingHours = 0;
            }

            // ✅ Recalculate only for working statuses
            if (['PRESENT', 'LATE', 'HALF_DAY'].includes(status) && attendance.checkIn && attendance.checkOut) {
                const checkInMinutes = parseTimeToMinutes(attendance.checkIn);
                const checkOutMinutes = parseTimeToMinutes(attendance.checkOut);

                if (checkInMinutes !== null && checkOutMinutes !== null) {
                    let diffMinutes = checkOutMinutes - checkInMinutes;
                    if (diffMinutes < 0) diffMinutes += 24 * 60;
                    attendance.workingHours = parseFloat((diffMinutes / 60).toFixed(2));
                }
            }

            if (remarks) attendance.remarks = remarks;
            attendance.markedBy = req.user._id;
            attendance.isManual = true;
        }else {
            // Create new
            attendance = new Attendance({
                employee: employeeId,
                date: selectedDate,
                checkIn: ['ABSENT','LEAVE'].includes(status) ? null : (checkIn || null),
                checkOut: ['ABSENT','LEAVE'].includes(status) ? null : (checkOut || null),
                workingHours: ['ABSENT','LEAVE'].includes(status) ? 0 : undefined,
                status: status,
                remarks: remarks || '',
                markedBy: req.user._id,
                isManual: true
            });
            
            // Calculate working hours if both times present
            if (attendance.checkIn && attendance.checkOut) {
                const checkInMinutes = parseTimeToMinutes(attendance.checkIn);
                const checkOutMinutes = parseTimeToMinutes(attendance.checkOut);
                
                if (checkInMinutes !== null && checkOutMinutes !== null) {
                    let diffMinutes = checkOutMinutes - checkInMinutes;
                    if (diffMinutes < 0) diffMinutes += 24 * 60;
                    attendance.workingHours = parseFloat((diffMinutes / 60).toFixed(2));
                }
            }
        }
        
        await attendance.save();
        const io = req.app.get('io');

        io.emit('attendanceUpdated', {
            employeeId,
            date: selectedDate,
            status: attendance.status,
            checkIn: attendance.checkIn,
            checkOut: attendance.checkOut,
            workingHours: attendance.workingHours
        });
        
        res.status(200).json({
            status: 'success',
            message: 'Attendance marked successfully',
            data: attendance
        });
        
    } catch (error) {
        console.error('Admin mark attendance error:', error);
        next(error);
    }
};

// ============================================
// 👑 ADMIN: GET ATTENDANCE BY EMPLOYEE
// ============================================
const getEmployeeAttendance = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;
        
        let query = { employee: employeeId };
        
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = {
                $gte: startDate,
                $lte: getEndOfDay(endDate)
            };
        } else {
            // Default to current month
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            query.date = {
                $gte: startDate,
                $lte: getEndOfDay(endDate)
            };
        }
        
        const attendance = await Attendance.find(query)
            .populate('employee', 'firstName lastName employeeId department')
            .sort({ date: -1 });
        
        res.status(200).json({
            status: 'success',
            data: attendance
        });
        
    } catch (error) {
        console.error('Get employee attendance error:', error);
        next(error);
    }
};

// ============================================
// 👑 ADMIN: GET MONTHLY ATTENDANCE SUMMARY
// ============================================
const getMonthlySummary = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        
        const selectedMonth = month || new Date().getMonth() + 1;
        const selectedYear = year || new Date().getFullYear();
        
        const startDate = new Date(selectedYear, selectedMonth - 1, 1);
        const endDate = new Date(selectedYear, selectedMonth, 0);
        
        const attendance = await Attendance.find({
            date: { $gte: startDate, $lte: getEndOfDay(endDate) }
        }).populate('employee', 'firstName lastName employeeId department');
        
        // Calculate summary
        const summary = {
            totalEmployees: new Set(attendance.map(a => a.employee?._id?.toString())).size,
            totalPresent: attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length,
            totalAbsent: attendance.filter(a => a.status === 'ABSENT').length,
            totalLate: attendance.filter(a => a.status === 'LATE').length,
            totalHalfDay: attendance.filter(a => a.status === 'HALF_DAY').length,
            totalLeave: attendance.filter(a => a.status === 'LEAVE').length,
            departmentWise: {}
        };
        
        // Department-wise breakdown
        attendance.forEach(record => {
            const dept = record.employee?.department || 'Unknown';
            if (!summary.departmentWise[dept]) {
                summary.departmentWise[dept] = {
                    present: 0,
                    absent: 0,
                    late: 0,
                    halfDay: 0,
                    leave: 0
                };
            }
            if (record.status === 'PRESENT' || record.status === 'LATE') {
                summary.departmentWise[dept].present++;
            } else if (record.status === 'ABSENT') {
                summary.departmentWise[dept].absent++;
            } else if (record.status === 'LATE') {
                summary.departmentWise[dept].late++;
            } else if (record.status === 'HALF_DAY') {
                summary.departmentWise[dept].halfDay++;
            } else if (record.status === 'LEAVE') {
                summary.departmentWise[dept].leave++;
            }
        });
        
        res.status(200).json({
            status: 'success',
            data: {
                summary,
                attendance
            }
        });
        
    } catch (error) {
        console.error('Monthly summary error:', error);
        next(error);
    }
};

// ============================================
// 👤 GET MONTHLY ATTENDANCE SUMMARY (EMPLOYEE)
// ============================================
const getMyMonthlySummary = async (req, res, next) => {
    try {
        const employeeId = req.user._id;
        const { month, year } = req.query;
        
        const currentMonth = month || new Date().getMonth() + 1;
        const currentYear = year || new Date().getFullYear();
        
        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get attendance records
        const attendance = await Attendance.find({
            employee: employeeId,
            date: { $gte: startDate, $lte: getEndOfDay(endDate) }
        });
        
        // Get approved leaves for this month
        const Leave = require('../models/Leave');
        const leaves = await Leave.find({
            employee: employeeId,
            status: 'APPROVED',
            startDate: { $lte: endDate },
            endDate: { $gte: startDate }
        });
        
        // Get holidays for this month
        const Holiday = require('../models/Holiday');
        const holidays = await Holiday.find({
            date: { $gte: startDate, $lte: endDate },
            isActive: true
        });
        
        // Calculate all days in month
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        
        // Create arrays of dates for quick lookup
        const attendanceDates = attendance.map(a => {
            const d = new Date(a.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        });
        
        const leaveDates = [];
        leaves.forEach(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                leaveDates.push(dateStr);
            }
        });
        
        const holidayDates = holidays.map(h => {
            const d = new Date(h.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        });
        
        // Calculate counts
        let present = 0;
        let absent = 0;
        let late = 0;
        let halfDay = 0;
        let leave = 0;
        let totalHours = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(currentYear, currentMonth - 1, day);
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            
            // Skip future dates
            if (currentDate > today) continue;
            
            // Check if holiday
            if (holidayDates.includes(dateStr)) {
                continue;
            }
            
            // Check if leave day
            if (leaveDates.includes(dateStr)) {
                leave++;
                continue;
            }
            
            // Check attendance
            if (attendanceDates.includes(dateStr)) {
    const record = attendance.find(a => {
        const d = new Date(a.date);
        const recDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return recDateStr === dateStr;
    });
    
    if (record) {
        // ✅ FIXED LOGIC
        if (record.status === 'PRESENT') {
            present++;
        } 
        else if (record.status === 'LATE') {
            present++;
            late++;
        } 
        else if (record.status === 'HALF_DAY') {
            present++;
            halfDay++;
        } 
        else if (record.status === 'ABSENT') {
            absent++;
        }

        totalHours += record.workingHours || 0;
    }
} else {
                // No attendance, no leave, not holiday = ABSENT
                absent++;
            }
        }
        
        res.status(200).json({
            status: 'success',
            data: {
                present,
                absent,
                late,
                halfDay,
                leave,
                totalHours: parseFloat(totalHours.toFixed(2)),
                records: attendance,
                monthDays: daysInMonth,
                workingDays: daysInMonth - holidayDates.length
            }
        });
        
    } catch (error) {
        console.error('My monthly summary error:', error);
        next(error);
    }
};

// ============================================
// ❌ UNMARK ATTENDANCE (Delete record)
// ============================================

const unmarkAttendance = async (req, res, next) => {
    try {
        const { date } = req.body;
        const employeeId = req.user._id;

        const selectedDate = new Date(date);

        const result = await Attendance.findOneAndDelete({
            employee: employeeId,
            date: {
                $gte: getStartOfDay(selectedDate),
                $lte: getEndOfDay(selectedDate)
            }
        });

        if (!result) {
            return res.status(404).json({
                status: 'error',
                message: 'No attendance found for this date'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Attendance unmarked successfully'
        });

    } catch (error) {
        console.error('Unmark attendance error:', error);
        next(error);
    }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
    markCheckIn,
    markCheckOut,
    unmarkAttendance,   // ⭐ ADD THIS
    getMyAttendance,
    adminMarkAttendance,
    getEmployeeAttendance,
    getMonthlySummary,
    getMyMonthlySummary
};