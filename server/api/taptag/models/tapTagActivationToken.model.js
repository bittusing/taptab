'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const TapTagActivationTokenSchema = new Schema(
  {
    tag: {
      type: Schema.Types.ObjectId,
      ref: 'TapTag',
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    context: {
      type: Map,
      of: String,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

TapTagActivationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
TapTagActivationTokenSchema.index({ phone: 1, tag: 1 }, { unique: true });

module.exports =
  mongoose.models.TapTagActivationToken ||
  mongoose.model('TapTagActivationToken', TapTagActivationTokenSchema);

