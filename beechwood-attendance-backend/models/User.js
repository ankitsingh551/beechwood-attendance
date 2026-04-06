            // models/User.js

            const mongoose = require('mongoose');
            const bcrypt = require('bcryptjs');

            const userSchema = new mongoose.Schema(
            {
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

            // 🔥 ADD THIS
            totalLeaves: {
                type: Number,
                default: 0
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

            // ================= AUTO EMPLOYEE ID (PRODUCTION SAFE) =================
            userSchema.pre('save', async function () {
                if (!this.isNew || this.employeeId) return;

                let unique = false;

                while (!unique) {
                    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit
                    const newId = `EMP${randomNum}`;

                    const exists = await mongoose.model('User').findOne({ employeeId: newId });
                    if (!exists) {
                        this.employeeId = newId;
                        unique = true;
                    }
                }
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