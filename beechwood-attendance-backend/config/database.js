// config/database.js - MongoDB Connection

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME || 'beechwood_attendance',
            // Remove deprecated options
        });

        console.log('='.repeat(60));
        console.log('🗄️  DATABASE CONNECTION');
        console.log('='.repeat(60));
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📁 Database Name: ${conn.connection.name}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;