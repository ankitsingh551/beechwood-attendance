// models/Attendance.js

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    checkIn: {
        type: String,
        default: null
    },
    checkOut: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'],
        default: 'PRESENT'
    },
    workingHours: {
        type: Number,
        default: 0
    },
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    remarks: {
        type: String,
        default: ''
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isManual: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// ✅ Unique constraint: one attendance per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });


// ✅ Helper to convert time string to minutes
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;

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
}


// ✅ Mongoose v7 compatible pre-save hook (NO next, NO callback)
attendanceSchema.pre('save', function () {
    if (this.checkIn && this.checkOut) {
        const checkInMinutes = parseTimeToMinutes(this.checkIn);
        const checkOutMinutes = parseTimeToMinutes(this.checkOut);

        if (checkInMinutes !== null && checkOutMinutes !== null) {
            let diffMinutes = checkOutMinutes - checkInMinutes;

            // Handle overnight shift
            if (diffMinutes < 0) diffMinutes += 24 * 60;

            this.workingHours = parseFloat((diffMinutes / 60).toFixed(2));
        }
    }
});

module.exports = mongoose.model('Attendance', attendanceSchema);