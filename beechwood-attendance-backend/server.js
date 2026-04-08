        // server.js - Main Application Entry Point
        const rateLimit = require('express-rate-limit');
        const http = require('http');
        const { Server } = require('socket.io');
        const express = require('express');
        const dotenv = require('dotenv');
        const cors = require('cors');
        const morgan = require('morgan');
        const helmet = require('helmet');
        const compression = require('compression');
        const path = require('path');

        // Load environment variables
        dotenv.config();

        // Import database connection
        const connectDB = require('./config/database');

        // Import routes
        const authRoutes = require('./routes/authRoutes');
        const userRoutes = require('./routes/userRoutes');
        const attendanceRoutes = require('./routes/attendanceRoutes');
        const leaveRoutes = require('./routes/leaveRoutes');
        const employeeRoutes = require('./routes/employeeRoutes');
        const holidayRoutes = require('./routes/holidayRoutes');
        const settingsRoutes = require('./routes/settingsRoutes');

        // Import error handler
        const { errorHandler } = require('./middleware/errorMiddleware');

        // Initialize express app
        const app = express();

        // ============================================
        // MIDDLEWARE
        // ============================================

        // Security middleware with CSP configured for inline scripts and styles
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "https:"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https:", "data:"],
                    imgSrc: ["'self'", "data:", "https:", "http:"],
                    connectSrc: ["'self'", "https:", "http:", "data:"],
                    fontSrc: ["'self'", "https:", "http:", "data:"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    frameAncestors: ["'self'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                },
            },
            crossOriginEmbedderPolicy: false,
            crossOriginResourcePolicy: { policy: "cross-origin" }
        }));

        // Compression middleware
        app.use(compression());

        // CORS middleware
        app.use(cors({
            origin: process.env.CORS_ORIGIN?.split(',') || [
                'http://localhost:5001',
                'http://127.0.0.1:5001'
            ],
            credentials: true,
            optionsSuccessStatus: 200
        }));

        // Logging middleware
        if (process.env.NODE_ENV === 'development') {
            app.use(morgan('dev'));
        }

        // Body parsing middleware
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // ============================================
        // DATABASE CONNECTION
        // ============================================

        connectDB();

        // ============================================
        // STATIC FILES (Frontend)
        // ============================================

        // Serve full frontend folder
        const frontendPath = path.join(__dirname, '../attendance-frontend');
        app.use(express.static(frontendPath));

        // Serve index.html on root route
        app.get('/', (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });


        // Health check
        app.get('/api/health', (req, res) => {
            res.status(200).json({
                status: 'success',
                message: 'Beechwood Attendance System API is running',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV
            });
        });

        const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: "Too many attempts, try later"
    });

    app.use('/api/auth/login', loginLimiter);
    app.use('/api/auth/forgot-password', loginLimiter);

        // API Routes
        app.use('/api/auth', authRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/attendance', attendanceRoutes);
        app.use('/api/leaves', leaveRoutes);
        app.use('/api/employees', employeeRoutes);
        app.use('/api/holidays', holidayRoutes);
        app.use('/api/settings', settingsRoutes);

        // ============================================
        // 404 HANDLER
        // ============================================

        // API 404 handler
        app.use('/api', (req, res) => {
            res.status(404).json({
                status: 'error',
                message: `API route not found: ${req.originalUrl}`
            });
        });

        // Frontend 404 handler - redirect to index.html for client-side routing
        app.use((req, res, next) => {

    // ✅ allow static files (CSS, JS, images)
    if (
        req.path.includes('.') || 
        req.path.startsWith('/socket.io')
    ) {
        return next();
    }

    // ✅ API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            status: 'error',
            message: `API route not found: ${req.path}`
        });
    }

    // ✅ frontend routes
    res.sendFile(path.join(frontendPath, 'index.html'));
});

        // ============================================
        // ERROR HANDLER
        // ============================================

        app.use(errorHandler);

// SOCKET + SERVER SETUP
// ============================================

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || [
            'http://localhost:5001',
            'http://127.0.0.1:5001'
        ],
        methods: ["GET", "POST"]
    }
});

// Make io accessible in controllers
app.set('io', io);

const jwt = require('jsonwebtoken');

io.use((socket, next) => {
    try {
       const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        if (!token) return next(new Error('Unauthorized'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Unauthorized'));
    }
});
// Socket connection
io.on('connection', (socket) => {
    console.log('⚡ Socket connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected:', socket.id);
    });
});

// START SERVER
// ============================================

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🐝 BEECHWOOD ATTENDANCE SYSTEM');
    console.log('='.repeat(60));
    console.log(`📡 Server running on port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
    console.log('⚡ Socket.io enabled');
    console.log('='.repeat(60));
});