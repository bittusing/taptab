'use strict';

const TapTag = require('../models/tapTag.model');
const TapTagMessage = require('../models/tapTagMessage.model');
const notificationService = require('./notification.service');
const securityUtil = require('../utils/security.util');

const sanitizeMeta = (meta = {}) =>
  Object.fromEntries(
    Object.entries(meta).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

const submitMessage = async ({ shortCode, message, ip, userAgent, meta }) => {
  const tag = await TapTag.findOne({ shortCode }).populate('assignedTo');

  if (!tag) {
    throw new Error('Tag not found');
  }

  if (tag.status !== 'activated') {
    throw new Error('Tag is not active yet');
  }

  const senderIpHash = securityUtil.hashIp(ip);

  const metaPayload = sanitizeMeta(meta);

  const entry = await TapTagMessage.create({
    tag: tag._id,
    channel: 'message',
    message,
    senderIpHash,
    userAgent,
    meta: metaPayload,
  });

  tag.activation = {
    ...(tag.activation || {}),
    lastMessageAt: new Date(),
  };
  await tag.save();

  await notificationService.notifyMessage({
    tag,
    message,
    entry,
    meta: metaPayload,
  });

  return entry;
};

const requestCallBack = async ({ shortCode, ip, userAgent, meta }) => {
  const tag = await TapTag.findOne({ shortCode }).populate('assignedTo');

  if (!tag) {
    throw new Error('Tag not found');
  }

  if (tag.status !== 'activated') {
    throw new Error('Tag is not active yet');
  }

  const senderIpHash = securityUtil.hashIp(ip);

  const metaPayload = sanitizeMeta(meta);

  const entry = await TapTagMessage.create({
    tag: tag._id,
    channel: 'call-request',
    senderIpHash,
    userAgent,
    meta: metaPayload,
  });

  await notificationService.notifyCallRequest({
    tag,
    meta: metaPayload,
    entry,
  });

  return entry;
};

module.exports = {
  submitMessage,
  requestCallBack,
};

