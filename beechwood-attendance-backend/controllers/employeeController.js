// controllers/employeeController.js

const User = require('../models/User');
const { sendWelcomeEmail } = require('../utils/emailService');

// Generate random password
const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// ============================================
// 👑 GET ALL EMPLOYEES (and admins)
// ============================================
const getAllEmployees = async (req, res, next) => {
    try {
        const users = await User.find({ role: { $in: ['employee', 'admin'] } })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            status: 'success',
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Get users error:', error);
        next(error);
    }
};

// ============================================
// 👑 GET SINGLE USER
// ============================================
const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id).select('-password');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        console.error('Get user error:', error);
        next(error);
    }
};

// ============================================
// 👑 ADD NEW USER (Admin Only)
// ============================================
const addUser = async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, department, designation, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'User already exists with this email'
            });
        }

        const plainPassword = generateRandomPassword();

        const userRole = role || 'employee';
        const defaultDepartment = userRole === 'admin' ? 'ADMIN' : 'IT';
        const defaultDesignation = userRole === 'admin' ? 'System Administrator' : 'Software Engineer';

        const user = await User.create({
            firstName,
            lastName,
            email,
            password: plainPassword,
            phone: phone || '',
            department: department || defaultDepartment,
            designation: designation || defaultDesignation,
            role: userRole,
            isActive: true,
            createdBy: req.user._id
        });

        try {
            await sendWelcomeEmail(user, plainPassword);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }

        res.status(201).json({
            status: 'success',
            message: `${userRole === 'admin' ? 'Admin' : 'User'} created successfully! Credentials sent to ${email}`,
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                employeeId: user.employeeId,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Add user error:', error);
        next(error);
    }
};

// ============================================
// 👑 UPDATE USER
// ============================================
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phone, department, designation, isActive } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;
        if (department) user.department = department;
        if (designation) user.designation = designation;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();

        res.json({
            status: 'success',
            message: 'User updated successfully',
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                employeeId: user.employeeId,
                department: user.department,
                designation: user.designation,
                isActive: user.isActive,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        next(error);
    }
};

// ============================================
// 👑 DELETE USER
// ============================================
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            message: 'User deleted successfully',
            data: {
                _id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                employeeId: user.employeeId
            }
        });
    } catch (error) {
        console.error('Delete user error:', error);
        next(error);
    }
};

// ============================================
// 👑 RESET USER PASSWORD
// ============================================
const resetUserPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                status: 'error',
                message: 'Password must be at least 6 characters'
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            status: 'success',
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        next(error);
    }
};

module.exports = {
    getAllEmployees,
    getUserById,
    addUser,
    updateUser,
    deleteUser,
    resetUserPassword
};