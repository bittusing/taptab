'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const TapTagMessageSchema = new Schema(
  {
    tag: {
      type: Schema.Types.ObjectId,
      ref: 'TapTag',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['message', 'call-request'],
      default: 'message',
      index: true,
    },
    message: {
      type: String,
      required: function () {
        return this.channel === 'message';
      },
      minlength: 10,
      maxlength: 500,
    },
    senderIpHash: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    meta: {
      type: Map,
      of: String,
      default: () => ({}),
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

TapTagMessageSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.TapTagMessage ||
  mongoose.model('TapTagMessage', TapTagMessageSchema);

