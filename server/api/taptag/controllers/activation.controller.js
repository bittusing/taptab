'use strict';

const {
  requestOtpSchema,
  confirmActivationSchema,
} = require('../validators/activation.validation');
const activationService = require('../services/activation.service');

const requestOtp = async (req, res) => {
  const { value, error } = requestOtpSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const result = await activationService.requestOtp({
    ...value,
    ip: req.ip,
  });

  return res.status(200).json({
    message: 'OTP sent successfully',
    expiresAt: result.expiresAt,
    otp: result.otp,
    tagId: result.tagId,
    shortCode: result.shortCode,
  });
};

const confirmActivation = async (req, res) => {
  const { value, error } = confirmActivationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const result = await activationService.confirmActivation({
    ...value,
    ip: req.ip,
  });

  return res.status(200).json({
    message: 'Tag activated successfully',
    tagId: result.tagId,
    shortCode: result.shortCode,
    shortUrl: result.shortUrl,
    assignedTo: result.assignedTo,
  });
};

module.exports = {
  requestOtp,
  confirmActivation,
};

