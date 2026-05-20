const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    totalAnnualLeaves: {
        type: Number,
        default: 12
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);