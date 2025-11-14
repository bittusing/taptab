'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const VirtualCallSchema = new Schema(
  {
    tag: {
      type: Schema.Types.ObjectId,
      ref: 'TapTag',
      required: true,
      index: true,
    },
    ownerPhone: {
      type: String,
      required: true,
      index: true,
    },
    visitorPhone: {
      type: String,
      required: true,
      index: true,
    },
    virtualNumber: {
      type: String,
      required: true,
      index: true,
    },
    twilioCallSid: {
      type: String,
      default: null,
      index: true,
    },
    twilioParentCallSid: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'],
      default: 'initiated',
      index: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'inbound',
    },
    duration: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    answeredAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    metadata: {
      type: Map,
      of: String,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

VirtualCallSchema.index({ tag: 1, createdAt: -1 });
VirtualCallSchema.index({ visitorPhone: 1, createdAt: -1 });
VirtualCallSchema.index({ twilioCallSid: 1 });

module.exports =
  mongoose.models.VirtualCall || mongoose.model('VirtualCall', VirtualCallSchema);

