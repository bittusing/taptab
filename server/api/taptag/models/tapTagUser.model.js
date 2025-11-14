'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const ContactPreferenceSchema = new Schema(
  {
    sms: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
    call: { type: Boolean, default: true },
  },
  { _id: false }
);

const VehicleSchema = new Schema(
  {
    number: { type: String, required: true, index: true },
    type: { type: String, default: 'car' },
    brand: { type: String },
    model: { type: String },
    color: { type: String },
  },
  { _id: false }
);

const TapTagUserSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    encryptedPhone: {
      type: String,
      default: null,
      index: false,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    vehicle: {
      type: VehicleSchema,
      required: true,
    },
    city: {
      type: String,
      default: null,
    },
    preferences: {
      type: ContactPreferenceSchema,
      default: () => ({}),
    },
    tags: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TapTag',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

TapTagUserSchema.index({ 'vehicle.number': 1 }, { unique: true });

module.exports =
  mongoose.models.TapTagUser || mongoose.model('TapTagUser', TapTagUserSchema);

