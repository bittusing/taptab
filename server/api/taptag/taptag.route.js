'use strict';

const express = require('express');
const tagController = require('./controllers/tag.controller');
const activationController = require('./controllers/activation.controller');
const messageController = require('./controllers/message.controller');
const adminApiKey = require('../../middleware/adminApiKey');
const rateLimitMiddleware = require('../../middleware/rateLimit');

const router = express.Router();
const base = '/v1';
// Public activation routes
router.post(base + '/activate-tag/request-otp', activationController.requestOtp);
router.post(base + '/activate-tag/confirm', activationController.confirmActivation);

// Visitor messaging routes
router.post(
  base + '/message',
  rateLimitMiddleware.rateLimitByIp?.(10, 60) || ((req, res, next) => next()),
  messageController.submitMessage
);

router.post(
  base + '/message/:shortCode',
  rateLimitMiddleware.rateLimitByIp?.(10, 60) || ((req, res, next) => next()),
  messageController.submitMessage
);

router.post(
  base + '/message/:shortCode/call-request',
  rateLimitMiddleware.rateLimitByIp?.(6, 60) || ((req, res, next) => next()),
  messageController.requestCallBack
);

// Admin-only routes
router.post(base + '/qr/generate-bulk', adminApiKey, tagController.generateBulk);
router.get(base + '/admin/tags', adminApiKey, tagController.list);
router.get(base + '/admin/dashboard/summary', adminApiKey, tagController.getSummary);
router.patch(
  base + '/admin/tags/:shortCode/status',
  adminApiKey,
  tagController.updateStatus
);

module.exports = router;

