const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');

const { Schema } = mongoose;
const TutorSpecificFields = new Schema({
  verified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalCourses: { type: Number, default: 0 },
  totalStudents: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  commissionRate: { type: Number, default: 20 },
  joinDate: { type: Date, default: Date.now },
  specialization: { type: [String], default: [] },
  certifications: { type: [String], default: [] }
});

const UserSchema = new Schema({
  name: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true,
  },
  phone: {
    type: String,
    required: false,
    trim: true,
  },
  hashedPassword: {
    type: String
  },
  role: {
    type: String,
    required: true,
    enum: ['Super Admin', 'User', 'Employee', 'Tutor','HR','Finance','Project Manager', 'Sales','Support Admin'],
    default: 'User'
  },
  profilePic: {
    type: String
  },
  deviceInfo: {
     type: Object,
     required: false
  },
  googleToken: {
    type: String,
    required: false
  },
  deviceToken: {
    type: String,
    required: false
  },
  resetPasswordToken: {
    type: String
  },
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  hashSalt: {
    type: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lastLogout: {
    type: Date,
    default: null
  },
  androidVersion: {
    type: String,
    default: null   
  },
  iosVersion: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  ipaddress: {
    type: String
  },
  fcmMobileToken: {
    type: String
  },
  
  bio: {
    type: String
  },
  skills: {
    type: [String],
    default: []
  },
  TutorSpecificFields: [TutorSpecificFields],
  github: {
    type: String
  },
  linkedin: {
    type: String
  },
  portfolio: {
    type: String
  },
  college: {
    type: String
  },
  course: {
    type: String
  },
  semester: {
    type: String
  },
  technologies: {
    type: [String],
    default: []
  },
  isPrime: {
    type: Boolean,
    default: false
  }
});

// Add plugins
UserSchema.plugin(timestamps);
UserSchema.plugin(mongooseDelete, {
  deletedBy: true,
  deletedAt: true
});

// Require at least one of email or phone
UserSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    return next(new Error('Either email or phone is required.'));
  }
  next();
});

// Enforce uniqueness only when the field is present and not empty
UserSchema.index(
  { email: 1 },
  { unique: true, sparse: true, partialFilterExpression: { email: { $exists: true, $ne: '' } } }
);
UserSchema.index(
  { phone: 1 },
  { unique: true, sparse: true, partialFilterExpression: { phone: { $exists: true, $ne: '' } } }
);

// Export the model
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
