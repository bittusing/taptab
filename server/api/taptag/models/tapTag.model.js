'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const ActivationSchema = new Schema(
  {
    activatedAt: { type: Date },
    activatedIp: { type: String },
    verifiedAt: { type: Date },
    lastMessageAt: { type: Date },
  },
  { _id: false }
);

const TapTagSchema = new Schema(
  {
    tagId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    qrUrl: {
      type: String,
      required: true,
    },
    shortUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['generated', 'assigned', 'activated', 'archived'],
      default: 'generated',
      index: true,
    },
    batchName: {
      type: String,
      default: null,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'TapTagUser',
      default: null,
    },
    activation: {
      type: ActivationSchema,
      default: () => ({}),
    },
    metadata: {
      type: Map,
      of: String,
      default: () => ({}),
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'TapTagAdmin',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TapTagSchema.index({ status: 1, batchName: 1 });
TapTagSchema.index({ createdAt: -1 });

module.exports = mongoose.models.TapTag || mongoose.model('TapTag', TapTagSchema);

