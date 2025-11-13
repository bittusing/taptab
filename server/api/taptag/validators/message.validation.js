'use strict';

const Joi = require('joi');

const shortCodeSchema = Joi.string().alphanum().min(6).max(16).required();

const submitMessageSchema = Joi.object({
  shortCode: shortCodeSchema,
  message: Joi.string().min(10).max(500).required(),
});

const callRequestSchema = Joi.object({
  shortCode: shortCodeSchema,
});

module.exports = {
  submitMessageSchema,
  callRequestSchema,
};

