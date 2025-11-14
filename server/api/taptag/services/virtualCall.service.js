'use strict';

const config = require('../../../config/environment');
const TapTag = require('../models/tapTag.model');
const VirtualCall = require('../models/virtualCall.model');

let twilioClient;

const getTwilioClient = () => {
  if (twilioClient) {
    return twilioClient;
  }
  const { accountSid, authToken } = config.notification.twilio;
  if (!accountSid || !authToken) {
    return null;
  }

  try {
    const Twilio = require('twilio');
    twilioClient = new Twilio(accountSid, authToken);
  } catch (error) {
    (global).logger?.warn?.('Twilio SDK not available. Run `npm install twilio` to enable virtual calls.');
    return null;
  }
  return twilioClient;
};

const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // If starts with 0, replace with country code (India: +91)
  if (cleaned.startsWith('0')) {
    return `+91${cleaned.substring(1)}`;
  }
  // If doesn't start with +, assume it's Indian number and add +91
  if (!cleaned.startsWith('+')) {
    return `+91${cleaned}`;
  }
  return `+${cleaned}`;
};

const getVirtualNumber = () => {
  const virtualNumber = config.notification.twilio.phoneNumber;
  if (!virtualNumber) {
    throw new Error('Twilio phone number is not configured');
  }
  return formatPhoneNumber(virtualNumber);
};

const initiateCall = async ({ shortCode, visitorPhone, metadata = {} }) => {
  const tag = await TapTag.findOne({ shortCode }).populate('assignedTo');

  if (!tag) {
    throw new Error('Tag not found');
  }

  if (tag.status !== 'activated') {
    throw new Error('Tag is not active yet');
  }

  const owner = tag.assignedTo;
  if (!owner || !owner.phone) {
    throw new Error('Tag owner phone number not found');
  }

  const client = getTwilioClient();
  if (!client) {
    throw new Error('Twilio client not configured');
  }

  const virtualNumber = getVirtualNumber();
  const formattedVisitorPhone = formatPhoneNumber(visitorPhone);
  const formattedOwnerPhone = formatPhoneNumber(owner.phone);

  if (!formattedVisitorPhone || !formattedOwnerPhone) {
    throw new Error('Invalid phone number format');
  }

  const baseUrl = config.publicBaseUrl.replace(/\/$/, '');
  const callStatusCallback = `${baseUrl}/api/v1/call/status`;
  const callConnectUrl = `${baseUrl}/api/v1/call/connect?shortCode=${shortCode}&visitorPhone=${encodeURIComponent(formattedVisitorPhone)}&ownerPhone=${encodeURIComponent(formattedOwnerPhone)}`;

  try {
    // Create the call from visitor to virtual number
    const call = await client.calls.create({
      to: virtualNumber,
      from: formattedVisitorPhone,
      url: callConnectUrl,
      statusCallback: callStatusCallback,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: false,
    });

    // Create virtual call record
    const virtualCall = await VirtualCall.create({
      tag: tag._id,
      ownerPhone: formattedOwnerPhone,
      visitorPhone: formattedVisitorPhone,
      virtualNumber,
      twilioCallSid: call.sid,
      status: 'initiated',
      direction: 'inbound',
      metadata,
    });

    return {
      callSid: call.sid,
      virtualNumber,
      status: 'initiated',
      virtualCallId: virtualCall._id,
    };
  } catch (error) {
    (global).logger?.error?.({ error: error.message, shortCode, visitorPhone }, 'Failed to initiate virtual call');
    throw new Error(`Failed to initiate call: ${error.message}`);
  }
};

const getCallHistory = async ({ shortCode, limit = 10, page = 1 }) => {
  const tag = await TapTag.findOne({ shortCode });
  if (!tag) {
    throw new Error('Tag not found');
  }

  const skip = (page - 1) * limit;
  const [calls, total] = await Promise.all([
    VirtualCall.find({ tag: tag._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    VirtualCall.countDocuments({ tag: tag._id }),
  ]);

  return {
    calls,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

const updateCallStatus = async ({ callSid, status, duration, metadata = {} }) => {
  const virtualCall = await VirtualCall.findOne({ twilioCallSid: callSid });
  if (!virtualCall) {
    (global).logger?.warn?.({ callSid }, 'Virtual call not found for status update');
    return null;
  }

  const updateData = {
    status,
    ...metadata,
  };

  if (duration) {
    updateData.duration = duration;
  }

  if (status === 'in-progress' && !virtualCall.startedAt) {
    updateData.startedAt = new Date();
  }

  if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer' || status === 'canceled') {
    updateData.endedAt = new Date();
    if (!updateData.startedAt && virtualCall.startedAt) {
      updateData.startedAt = virtualCall.startedAt;
    }
  }

  await VirtualCall.updateOne({ _id: virtualCall._id }, { $set: updateData });

  return virtualCall;
};

module.exports = {
  initiateCall,
  getCallHistory,
  updateCallStatus,
  getVirtualNumber,
  formatPhoneNumber,
};

