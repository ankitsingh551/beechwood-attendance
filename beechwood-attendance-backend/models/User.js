            // models/User.js

            const mongoose = require('mongoose');
            const bcrypt = require('bcryptjs');

            const userSchema = new mongoose.Schema({
                firstName: {
                    type: String,
                    required: [true, 'First name is required'],
                    trim: true
                },

                lastName: {
                    type: String,
                    required: [true, 'Last name is required'],
                    trim: true
                },

                email: {
                    type: String,
                    required: [true, 'Email is required'],
                    unique: true,
                    lowercase: true,
                    trim: true,
                    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email']
                },

                phone: {
                    type: String,
                    trim: true
                },

                employeeId: {
                    type: String,
                    unique: true,
                    sparse: true
                },

                department: {
                    type: String,
                    enum: ['IT', 'HR', 'FIN', 'MKT', 'SALES', 'OPS', 'ADMIN'],
                    default: 'IT'
                },

                designation: {
                    type: String,
                    default: 'Software Engineer'
                },

                joiningDate: {
                    type: Date,
                    default: Date.now
                },

                password: {
                    type: String,
                    required: [true, 'Password is required'],
                    minlength: 6,
                    select: false
                },

                role: {
                    type: String,
                    enum: ['admin', 'employee'],
                    default: 'employee'
                },

                isActive: {
                    type: Boolean,
                    default: true
                },

                isEmailVerified: {
                    type: Boolean,
                    default: false
                },

                lastLogin: {
                    type: Date
                },

                createdBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },

                resetPasswordToken: {
                    type: String
                },

                resetPasswordExpires: {
                    type: Date
                },

                // ================= PAYROLL FIELDS =================

                currentSalary: {
                    type: Number,
                    default: 0
                },

                tdsPercentage: {
                    type: Number,
                    default: 10
                }

            },
            {
                timestamps: true
            });

            // ================= VIRTUAL =================
            userSchema.virtual('fullName').get(function () {
                return `${this.firstName} ${this.lastName}`;
            });

            // ================= PASSWORD HASH (Mongoose 7/8 style) =================
            userSchema.pre('save', async function () {
                if (!this.isModified('password')) return;

                const salt = await bcrypt.genSalt(10);
                this.password = await bcrypt.hash(this.password, salt);
            });

            // ================= AUTO EMPLOYEE ID =================
     userSchema.pre('save', async function () {

                // Skip if:
                // 1. not new user
                // 2. employeeId already exists
                // 3. admin user
                if (
                    !this.isNew ||
                    this.employeeId ||
                    this.role === 'admin'
                ) {
                    return;
                }

                // Get last created employee
                const lastEmployee = await mongoose
                    .model('User')
                    .findOne({
                        role: 'employee',
                        employeeId: { $regex: /^BW\d+$/ }
                    })
                    .sort({ createdAt: -1 });

                let nextNumber = 1;

                // Extract last number
                if (lastEmployee && lastEmployee.employeeId) {

                    const lastNumber = parseInt(
                        lastEmployee.employeeId.replace('BW', ''),
                        10
                    );

                    nextNumber = lastNumber + 1;
                }

                // Generate IDs:
                // BW01
                // BW02
                // BW10
                // BW100
                this.employeeId =
                    `BW${String(nextNumber).padStart(2, '0')}`;
            });

            // ================= SAFE PASSWORD COMPARE (FIXED) =================
            userSchema.methods.comparePassword = async function (candidatePassword) {
                // The password is already available in this.password because we have select: false
                // We need to access it properly
                if (!this.password) {
                    // If password is not loaded, fetch it
                    const user = await mongoose.model('User').findById(this._id).select('+password');
                    return bcrypt.compare(candidatePassword, user.password);
                }
                return bcrypt.compare(candidatePassword, this.password);
            };

            // ================= CLEAN JSON OUTPUT =================
            userSchema.methods.toJSON = function () {
                const obj = this.toObject();
                delete obj.password;
                delete obj.__v;
                return obj;
            };

            module.exports = mongoose.model('User', userSchema);