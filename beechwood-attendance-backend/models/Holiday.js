const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
    },

    date: {
      type: Date,
      required: [true, 'Date is required'],
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    type: {
      type: String,
      enum: ['festival', 'holiday', 'restricted'],
      default: 'holiday',
    },

    icon: {
      type: String,
      default: '🎉',
    },

    isOptional: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    applicableDepartments: {
      type: [String],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ✅ ONLY ONE UNIQUE INDEX
 * Ensures one holiday per date
 */
holidaySchema.index({ date: 1 }, { unique: true });

/**
 * ✅ Mongoose v7+ compatible middleware (NO next)
 * Normalize date to midnight to avoid duplicates with time
 */
holidaySchema.pre('save', function () {
  if (this.date) {
    this.date.setHours(0, 0, 0, 0);
  }
});

/**
 * ✅ Friendly duplicate error message
 */
holidaySchema.post('save', function (error, doc, next) {
  if (error?.code === 11000) {
    return next(new Error('A holiday already exists for this date.'));
  }
  return next(error);
});

module.exports = mongoose.model('Holiday', holidaySchema);