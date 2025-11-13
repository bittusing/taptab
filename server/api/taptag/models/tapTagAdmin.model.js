'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const TapTagAdminSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['super-admin', 'ops', 'support'],
      default: 'ops',
    },
    name: {
      type: String,
      trim: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

TapTagAdminSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports =
  mongoose.models.TapTagAdmin ||
  mongoose.model('TapTagAdmin', TapTagAdminSchema);

