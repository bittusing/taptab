'use strict';

const config = require('../../../config/environment');

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
    (global).logger?.warn?.('Twilio SDK not available. Run `npm install twilio` to enable SMS delivery.');
    return null;
  }
  return twilioClient;
};

const sendSmsViaTwilio = async ({ to, body }) => {
  const client = getTwilioClient();
  if (!client) {
    (global).logger?.info?.({ to, body }, 'Skipping Twilio SMS delivery (client not configured)');
    return null;
  }

  const messagingServiceSid = config.notification.twilio.messagingServiceSid;
  if (!messagingServiceSid) {
    throw new Error('Twilio messaging service SID is not configured');
  }

  return client.messages.create({
    to,
    messagingServiceSid,
    body,
  });
};

const sendOtp = async ({ phone, otp, tag }) => {
  const message = `TapTag verification code: ${otp}. This code is valid for ${config.notification.otpTtlMinutes || 10} minutes.`;

  switch (config.notification.smsProvider) {
    case 'twilio':
      await sendSmsViaTwilio({ to: phone, body: message });
      break;
    default:
      (global).logger?.info?.(
        { phone, otp, tagId: tag.tagId },
        'OTP delivery simulated (no SMS provider configured)'
      );
  }
};

const notifyActivation = async ({ user, tag }) => {
  (global).logger?.info?.(
    {
      tagId: tag.tagId,
      shortCode: tag.shortCode,
      phone: user.phone,
    },
    'Tag activation confirmed'
  );
};

const notifyMessage = async ({ tag, message, entry, meta }) => {
  (global).logger?.info?.(
    {
      tagId: tag.tagId,
      shortCode: tag.shortCode,
      owner: tag.assignedTo?.phone,
      messageId: entry._id,
      meta,
    },
    'New visitor message recorded'
  );
};

const notifyCallRequest = async ({ tag, entry, meta }) => {
  (global).logger?.info?.(
    {
      tagId: tag.tagId,
      shortCode: tag.shortCode,
      owner: tag.assignedTo?.phone,
      entryId: entry._id,
      meta,
    },
    'Call-back request captured'
  );
};

module.exports = {
  sendOtp,
  notifyActivation,
  notifyMessage,
  notifyCallRequest,
};

