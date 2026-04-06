// middleware/errorMiddleware.js - Error Handler

const errorHandler = (err, req, res, next) => {
    console.error('Error details:', err);
    
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || 'Something went wrong';

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyPattern)[0];
        message = `${field} already exists`;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(e => e.message).join(', ');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Handle pre-save hook errors
    if (err.message === 'next is not a function' || err.message.includes('next')) {
        statusCode = 500;
        message = 'Internal server error during save operation';
    }

    res.status(statusCode).json({
        status: 'error',
        message: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : null
    });
};

module.exports = { errorHandler };