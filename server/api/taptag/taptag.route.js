'use strict';

const express = require('express');
const taptagController = require('./taptag.controller');
const authService = require('../auth/auth.service');
const rateLimitMiddleware = require('../../middleware/rateLimit');
const { joiValidate } = require('../../helpers/apiValidation.helper.js');
const {
    validateGenerateBulk,
    validateList,
    validateUpdateStatus,
    validateRequestOtp,
    validateConfirmActivation,
    validateSubmitMessage,
    validateRequestCallBack,
    validateInitiateCall,
    validateGetCallHistory,
    validateAssignToAffiliate,
    validateGetAffiliateTags,
} = require('./taptag.validation');

const router = express.Router();
const base = '/v1';

// ==================== Admin Routes ====================

router.post(
    base + '/qr/generate-bulk',
    joiValidate(validateGenerateBulk),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin'] }),
    taptagController.generateBulk
);

router.get(
    base + '/admin/tags',
    // joiValidate(validateList),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin', 'Affiliate'] }),
    taptagController.list
);

router.get(
    base + '/admin/dashboard/summary',
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin', 'Affiliate'] }),
    taptagController.getSummary
);

router.patch(
    base + '/admin/tags/:shortCode/status',
    joiValidate(validateUpdateStatus),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin'] }),
    taptagController.updateStatus
);

// ==================== Activation Routes ====================

router.post(
    base + '/activate-tag/request-otp',
    joiValidate(validateRequestOtp),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin', 'Affiliate'] }),
    rateLimitMiddleware.rateLimitByIp?.(5, 60) || ((req, res, next) => next()),
    taptagController.requestOtp
);

router.post(
    base + '/activate-tag/confirm',
    joiValidate(validateConfirmActivation),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin', 'Affiliate'] }),
    rateLimitMiddleware.rateLimitByIp?.(3, 60) || ((req, res, next) => next()),
    taptagController.confirmActivation
);

// ==================== Visitor Message Routes ====================

// router.post(
//     base + '/message',
//     joiValidate(validateSubmitMessage),
//     rateLimitMiddleware.rateLimitByIp?.(10, 60) || ((req, res, next) => next()),
//     taptagController.submitMessage
// );

// router.post(
//     base + '/message/:shortCode',
//     joiValidate(validateSubmitMessage),
//     rateLimitMiddleware.rateLimitByIp?.(10, 60) || ((req, res, next) => next()),
//     taptagController.submitMessage
// );

// router.post(
//     base + '/message/:shortCode/call-request',
//     joiValidate(validateRequestCallBack),
//     rateLimitMiddleware.rateLimitByIp?.(6, 60) || ((req, res, next) => next()),
//     taptagController.requestCallBack
// );

// ==================== Virtual Call Routes ====================

// router.get(
//     base + '/call/virtual-number',
//     rateLimitMiddleware.rateLimitByIp?.(10, 60) || ((req, res, next) => next()),
//     taptagController.getVirtualNumber
// );

// router.post(
//     base + '/call/:shortCode/initiate',
//     joiValidate(validateInitiateCall),
//     rateLimitMiddleware.rateLimitByIp?.(5, 60) || ((req, res, next) => next()),
//     taptagController.initiateCall
// );

// router.get(
//     base + '/call/:shortCode/history',
//     joiValidate(validateGetCallHistory),
//     rateLimitMiddleware.rateLimitByIp?.(10, 60) || ((req, res, next) => next()),
//     taptagController.getCallHistory
// );

// ==================== Affiliate Routes ====================

router.post(
    base + '/admin/tags/assign-affiliate',
    joiValidate(validateAssignToAffiliate),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin'] }),
    taptagController.assignToAffiliate
);

router.get(
    base + '/affiliate/tags',
    joiValidate(validateGetAffiliateTags),
    authService.isAuthenticated({ role: ['Affiliate'] }),
    taptagController.getAffiliateTags
);


// ==================== Twilio Webhook Routes ====================

router.post(
    base + '/call/connect',
    taptagController.handleCallConnect
);

router.post(
    base + '/call/status',
    taptagController.handleCallStatus
);

router.post(
    base + '/call/dial-status',
    taptagController.handleDialStatus
);

module.exports = router;
