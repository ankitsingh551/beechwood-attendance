const Settings = require('../models/Settings');

// ============================================
// SAVE SETTINGS
// ============================================

const saveSettings = async (req, res) => {
    try {

        let settings = await Settings.findOne();

        if (!settings) {
            settings = new Settings();
        }

        settings.totalAnnualLeaves = req.body.totalAnnualLeaves || 12;

        await settings.save();

        res.json({
            status: 'success',
            message: 'Settings saved successfully',
            data: settings
        });

    } catch (error) {
        console.error('Save settings error:', error);

        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// ============================================
// GET SETTINGS
// ============================================

const getSettings = async (req, res) => {
    try {

        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create({
                totalAnnualLeaves: 12
            });
        }

        res.json({
            status: 'success',
            data: settings
        });

    } catch (error) {
        console.error('Get settings error:', error);

        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    saveSettings,
    getSettings
};