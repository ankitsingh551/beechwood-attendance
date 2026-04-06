const User = require('../models/User');

const saveSettings = async (req, res) => {
   try {
      const { companyName, annualLeaveQuota } = req.body;

      console.log("Received settings:", annualLeaveQuota);

      // 🔥 THIS IS THE MAIN FIX
      await User.updateMany(
         { role: 'employee' },
         { $set: { totalLeaves: parseInt(annualLeaveQuota) } }
      );

      res.json({
         status: 'success',
         message: 'Settings saved & employees updated'
      });

   } catch (error) {
      console.error(error);
      res.status(500).json({
         status: 'error',
         message: error.message
      });
   }
};
const getSettings = async (req, res) => {
   try {
      // Get any one employee (all have same value)
      const user = await User.findOne({ role: 'employee' });

      res.json({
         status: 'success',
         data: {
            annualLeaveQuota: user?.totalLeaves ?? 0
         }
      });

   } catch (error) {
      res.status(500).json({
         status: 'error',
         message: error.message
      });
   }
};

module.exports = { saveSettings, getSettings };