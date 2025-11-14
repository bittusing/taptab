'use strict';

const mongoose = require('mongoose');
const TapTag = require('../models/tapTag.model');
const TapTagUser = require('../models/tapTagUser.model');
const TapTagActivationToken = require('../models/tapTagActivationToken.model');
const notificationService = require('./notification.service');
const securityUtil = require('../utils/security.util');
const phoneEncryption = require('../utils/phoneEncryption.util');
const config = require('../../../config/environment');

const OTP_TTL_MINUTES = config.notification.otpTtlMinutes || 10;

const requestOtp = async ({ tagId, shortCode, phone, ip }) => {
  const tag = await TapTag.findOne({
    $or: [{ tagId }, { shortCode }],
  });

  if (!tag) {
    throw new Error('Tag not found');
  }

  if (tag.status === 'archived') {
    throw new Error('Tag is archived and cannot be activated');
  }

  const otp = securityUtil.generateOtp();
  const otpHash = await securityUtil.hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await TapTagActivationToken.findOneAndUpdate(
    { tag: tag._id, phone },
    {
      otpHash,
      expiresAt,
      attempts: 0,
      context: new Map(Object.entries({ ip: ip || 'unknown' })),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await notificationService.sendOtp({ phone, otp, tag });

  return {
    expiresAt,
    otp,
    tagId: tag.tagId,
    shortCode: tag.shortCode,
  };
};

const confirmActivation = async ({
  tagId,
  shortCode,
  otp,
  fullName,
  phone,
  vehicleNumber,
  vehicleType,
  city,
  email,
  preferences = {},
  ip,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const tag = await TapTag.findOne(
      {
        $or: [{ tagId }, { shortCode }],
      },
      null,
      { session }
    );

    if (!tag) {
      throw new Error('Tag not found');
    }

    const token = await TapTagActivationToken.findOne(
      { tag: tag._id, phone },
      null,
      { session }
    );

    if (!token) {
      throw new Error('OTP expired or not requested');
    }

    if (token.attempts >= token.maxAttempts) {
      throw new Error('Maximum verification attempts exceeded');
    }

    const isValidOtp = await securityUtil.verifyOtp(otp, token.otpHash);
    if (!isValidOtp) {
      token.attempts += 1;
      await token.save({ session });
      throw new Error('Invalid OTP');
    }

    const vehiclePayload = {
      number: vehicleNumber.trim().toUpperCase(),
      type: vehicleType || 'car',
    };

    // Encrypt phone number for secure storage
    const encryptedPhone = phoneEncryption.encryptPhone(phone);

    const user = await TapTagUser.findOneAndUpdate(
      {
        $or: [
          { phone },
          { 'vehicle.number': vehiclePayload.number },
        ],
      },
      {
        fullName,
        phone,
        encryptedPhone,
        email,
        city,
        vehicle: vehiclePayload,
        preferences: { ...preferences },
        isActive: true,
        $addToSet: { tags: tag._id },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, session }
    );

    tag.status = 'activated';
    tag.assignedTo = user._id;
    tag.activation = {
      activatedAt: new Date(),
      activatedIp: ip || null,
      verifiedAt: new Date(),
    };

    await tag.save({ session });
    await TapTagActivationToken.deleteOne({ _id: token._id }, { session });

    await session.commitTransaction();

    await notificationService.notifyActivation({
      user,
      tag,
    });

    return {
      tagId: tag.tagId,
      shortCode: tag.shortCode,
      shortUrl: tag.shortUrl,
      assignedTo: {
        fullName: user.fullName,
        phone: user.phone,
        vehicle: user.vehicle,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  requestOtp,
  confirmActivation,
};

