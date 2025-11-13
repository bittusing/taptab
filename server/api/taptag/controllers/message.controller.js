'use strict';

const {
  submitMessageSchema,
  callRequestSchema,
} = require('../validators/message.validation');
const messageService = require('../services/message.service');

const submitMessage = async (req, res) => {
  const { value, error } = submitMessageSchema.validate({
    ...req.body,
    shortCode: req.params.shortCode || req.body.shortCode,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  await messageService.submitMessage({
    shortCode: value.shortCode,
    message: value.message,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    meta: {
      reason: req.body.reason,
      note: req.body.note,
      digits: req.body.digits,
      callbackPhone: req.body.callbackPhone,
    },
  });

  return res.status(201).json({ message: 'Message delivered to the owner' });
};

const requestCallBack = async (req, res) => {
  const { value, error } = callRequestSchema.validate({
    shortCode: req.params.shortCode || req.body.shortCode,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  await messageService.requestCallBack({
    shortCode: value.shortCode,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    meta: {
      reason: req.body.reason,
      note: req.body.note,
      digits: req.body.digits,
      callbackPhone: req.body.callbackPhone,
    },
  });

  return res.status(202).json({ message: 'Call-back request submitted' });
};

module.exports = {
  submitMessage,
  requestCallBack,
};

