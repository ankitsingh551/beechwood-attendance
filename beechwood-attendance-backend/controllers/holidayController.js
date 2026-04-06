// controllers/holidayController.js - Holiday Management

const Holiday = require('../models/Holiday');

// ============================================
// 👑 ADMIN: CREATE HOLIDAY
// ============================================
const createHoliday = async (req, res, next) => {
    try {
        const { name, date, description, type, icon, isOptional, applicableDepartments } = req.body;

        if (!name || !date) {
            return res.status(400).json({
                status: 'error',
                message: 'Name and date are required'
            });
        }

        const existingHoliday = await Holiday.findOne({ date });
        if (existingHoliday) {
            return res.status(400).json({
                status: 'error',
                message: 'Holiday already exists on this date'
            });
        }

        const holiday = await Holiday.create({
            name,
            date,
            description: description || '',
            type: type || 'holiday',
            icon: icon || '🎉',
            isOptional: isOptional || false,
            applicableDepartments: applicableDepartments || [],
            createdBy: req.user._id
        });

        res.status(201).json({
            status: 'success',
            message: 'Holiday created successfully',
            data: holiday
        });
    } catch (error) {
        console.error('Create holiday error:', error);
        next(error);
    }
};

// ============================================
// 👑 ADMIN: GET ALL HOLIDAYS
// ============================================
const getAllHolidays = async (req, res, next) => {
    try {
        const { year, month, isActive } = req.query;
        
        let query = {};
        
        if (year && month) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }
        
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        
        const holidays = await Holiday.find(query)
            .sort({ date: 1 })
            .select('-createdBy');
        
        res.status(200).json({
            status: 'success',
            count: holidays.length,
            data: holidays
        });
    } catch (error) {
        console.error('Get holidays error:', error);
        next(error);
    }
};

// ============================================
// controllers/holidayController.js - Check this function

const getUpcomingHolidays = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3); // Next 3 months
        
        const holidays = await Holiday.find({
            date: { $gte: today, $lte: endDate },
            isActive: true
        }).sort({ date: 1 }).limit(10);
        
        res.status(200).json({
            status: 'success',
            count: holidays.length,
            data: holidays
        });
    } catch (error) {
        console.error('Get upcoming holidays error:', error);
        next(error);
    }
};
// ============================================
// 👑 ADMIN: UPDATE HOLIDAY
// ============================================
const updateHoliday = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, date, description, type, icon, isOptional, isActive, applicableDepartments } = req.body;
        
        const holiday = await Holiday.findById(id);
        if (!holiday) {
            return res.status(404).json({
                status: 'error',
                message: 'Holiday not found'
            });
        }
        
        if (name) holiday.name = name;
        if (date) holiday.date = date;
        if (description) holiday.description = description;
        if (type) holiday.type = type;
        if (icon) holiday.icon = icon;
        if (isOptional !== undefined) holiday.isOptional = isOptional;
        if (isActive !== undefined) holiday.isActive = isActive;
        if (applicableDepartments) holiday.applicableDepartments = applicableDepartments;
        
        await holiday.save();
        
        res.status(200).json({
            status: 'success',
            message: 'Holiday updated successfully',
            data: holiday
        });
    } catch (error) {
        console.error('Update holiday error:', error);
        next(error);
    }
};

// ============================================
// 👑 ADMIN: DELETE HOLIDAY
// ============================================
const deleteHoliday = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const holiday = await Holiday.findByIdAndDelete(id);
        if (!holiday) {
            return res.status(404).json({
                status: 'error',
                message: 'Holiday not found'
            });
        }
        
        res.status(200).json({
            status: 'success',
            message: 'Holiday deleted successfully'
        });
    } catch (error) {
        console.error('Delete holiday error:', error);
        next(error);
    }
};

module.exports = {
    createHoliday,
    getAllHolidays,
    getUpcomingHolidays,
    updateHoliday,
    deleteHoliday
};