// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            req.user = await User.findById(decoded.id)
                .select('-password');

            if (!req.user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            return next();

        } catch (error) {
            console.error('Auth error:', error);

            return res.status(401).json({
                status: 'error',
                message: 'Not authorized'
            });
        }
    }

    return res.status(401).json({
        status: 'error',
        message: 'Not authorized, no token'
    });
};

// Admin only middleware
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            status: 'error',
            message: 'Not authorized as admin'
        });
    }
};

module.exports = { protect, adminOnly };