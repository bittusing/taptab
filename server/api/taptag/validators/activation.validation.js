'use strict';

const Joi = require('joi');

const tagIdentifier = Joi.alternatives().try(
  Joi.string().guid({ version: 'uuidv4' }),
  Joi.string().alphanum().min(6).max(16)
);

const requestOtpSchema = Joi.object({
  tagId: tagIdentifier.optional(),
  shortCode: Joi.string().min(6).max(16).optional(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
}).custom((value, helpers) => {
  if (!value.tagId && !value.shortCode) {
    return helpers.error('any.custom', { message: 'Either tagId or shortCode is required' });
  }
  return value;
});

const confirmActivationSchema = Joi.object({
  tagId: tagIdentifier.optional(),
  shortCode: Joi.string().min(6).max(16).optional(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  fullName: Joi.string().min(3).max(80).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  email: Joi.string().email().optional(),
  vehicleNumber: Joi.string().trim().replace(/\s+/g, '').uppercase().min(6).max(20).required(),
  vehicleType: Joi.string().valid('car', 'bike', 'scooter', 'truck', 'other').optional(),
  city: Joi.string().max(60).optional(),
  preferences: Joi.object({
    sms: Joi.boolean().optional(),
    whatsapp: Joi.boolean().optional(),
    call: Joi.boolean().optional(),
  }).optional(),
}).custom((value, helpers) => {
  if (!value.tagId && !value.shortCode) {
    return helpers.error('any.custom', { message: 'Either tagId or shortCode is required' });
  }
  return value;
});

module.exports = {
  requestOtpSchema,
  confirmActivationSchema,
};

