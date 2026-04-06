// controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailService');

// Generate random password
const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

// ============================================
// 🔑 LOGIN USER
// ============================================
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                status: 'error',
                message: 'Account is disabled. Please contact admin.'
            });
        }

        // Update last login
        user.lastLogin = Date.now();
        await user.save();

        res.json({
    status: 'success',
    data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation,
        joiningDate: user.createdAt,
        role: user.role,
        token: generateToken(user._id)
    }
});

    } catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};

// 👑 ADMIN CREATE USER (Employee or Admin)
// ============================================
const adminCreateUser = async (req, res, next) => {
    try {
        const { fullName, email, phone, department, designation, role } = req.body;

        if (!fullName || !email) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide all required fields'
            });
        }

        // 🔧 FIX: derive firstName/lastName from fullName (do NOT change schema)
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '-';

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                status: 'error',
                message: 'User already exists with this email'
            });
        }

        // Generate random password
        const plainPassword = generateRandomPassword();

        // Set default department and designation based on role
        const userRole = role || 'employee';
        const defaultDepartment = userRole === 'admin' ? 'ADMIN' : 'IT';
        const defaultDesignation = userRole === 'admin' ? 'System Administrator' : 'Software Engineer';

        // Create user (UNCHANGED structure)
        const user = await User.create({
            firstName,              // ✅ now defined
            lastName,               // ✅ now defined
            email,
            password: plainPassword,
            phone: phone || '',
            department: department || defaultDepartment,
            designation: designation || defaultDesignation,
            role: userRole,
            isActive: true,
            createdBy: req.user._id
        });

        // Send welcome email with credentials
        try {
            await sendWelcomeEmail(user, plainPassword);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }

        res.status(201).json({
            status: 'success',
            message: `${userRole === 'admin' ? 'Admin' : 'Employee'} created successfully! Credentials sent to ${email}`,
            data: {
                _id: user._id,
                 fullName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                employeeId: user.employeeId,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Admin create user error:', error);
        next(error);
    }
};

// ============================================
// 👤 GET PROFILE
// ============================================
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        
        res.json({
    status: 'success',
    data: {
        ...user._doc,
        fullName: `${user.firstName} ${user.lastName}`
    }
});
        
    } catch (error) {
        console.error('Profile error:', error);
        next(error);
    }
};

// ============================================
// 🔐 FORGOT PASSWORD
// ============================================
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
        return res.json({
            status: 'success',
            message: 'If email exists, reset link sent'
        });
    }

        const resetToken = crypto.randomBytes(32).toString('hex');

        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000;

        await user.save();

        try {
            await sendPasswordResetEmail(user, resetToken);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }

        res.json({
            status: 'success',
            message: 'Password reset email sent. Please check your inbox.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        next(error);
    }
};

// ============================================
// 🔐 RESET PASSWORD
// ============================================
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'Token and new password are required'
            });
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid or expired reset token'
            });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({
            status: 'success',
            message: 'Password reset successful. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        next(error);
    }
};

// ============================================
// 👤 UPDATE PROFILE
// ============================================
const updateProfile = async (req, res, next) => {
    try {
        const { phone, address, city, state, pincode, department, designation } = req.body;
        
        const user = await User.findById(req.user._id);
        
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (city) user.city = city;
        if (state) user.state = state;
        if (pincode) user.pincode = pincode;
        if (department) user.department = department;
        if (designation) user.designation = designation;
        
        await user.save();
        
        res.json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
        ...user._doc,
        fullName: `${user.firstName} ${user.lastName}`
            }
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        next(error);
    }
};

// ============================================
// 👤 CHANGE PASSWORD
// ============================================
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user._id).select('+password');
        
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                status: 'error',
                message: 'Current password is incorrect'
            });
        }
        
        user.password = newPassword;
        await user.save();
        
        res.json({
            status: 'success',
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        next(error);
    }
};

module.exports = {
    loginUser,
    adminCreateUser,
    getProfile,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword
};