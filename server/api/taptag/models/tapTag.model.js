'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const ActivationSchema = new Schema(
  {
    activatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
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
    stickerUrl: {
      type: String,
      default: null,
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
    // assignedTo: {
    //   type: Schema.Types.ObjectId,
    //   ref: 'TapTagUser',
    //   default: null,
    // },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',   // affiliate user id ko assign karne ke liye
      default: null,
    },
    ownerAssignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'TapTagUser',   // owner user id ko assign karne ke liye
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

