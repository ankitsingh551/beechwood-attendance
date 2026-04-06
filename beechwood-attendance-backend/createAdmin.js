// createAdmin.js - Run this to create admin user

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import User model
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || 'beechwood_attendance'
});

const createAdmin = async () => {
    try {
        console.log('🚀 Creating admin user...');

        // ❌ DELETE OLD ADMIN (VERY IMPORTANT)
        await User.deleteOne({ email: 'admin@beechwood.com' });

        // ✅ Create admin (NO HASHING HERE)
        const admin = await User.create({
            firstName: 'System',
            lastName: 'Administrator',
            email: 'admin@beechwood.com',
            password: 'Admin@2026', // ✅ plain password
            role: 'admin',
            isActive: true,
            department: 'ADMIN',
            designation: 'System Administrator',
            employeeId: 'ADMIN001'
        });

        console.log('✅ Admin user created successfully!');
        console.log('='.repeat(50));
        console.log('Email: admin@beechwood.com');
        console.log('Password: Admin@2026');
        console.log('Role: admin');
        console.log('ID:', admin._id);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    } finally {
        mongoose.disconnect();
    }
};

createAdmin();