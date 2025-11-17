const Joi = require('joi');

// ==================== Tag Management ====================

exports.validateGenerateBulk = {
    body: Joi.object({
        count: Joi.number().integer().min(1).max(500).required(),
        batchName: Joi.string().max(64).optional(),
        metadata: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
        assignedTo: Joi.string().optional().default(null).allow(null).allow(''),
    })
};

exports.validateList = {
    query: Joi.object({
        status: Joi.string().valid('generated', 'assigned', 'activated', 'archived').optional(),
        search: Joi.string().optional(),
        batchName: Joi.string().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    })
};

exports.validateUpdateStatus = {
    body: Joi.object({
        status: Joi.string().valid('generated', 'assigned', 'activated', 'archived').required(),
    })
};

// ==================== Activation ====================

exports.validateRequestOtp = {
    body: Joi.object({
        tagId: Joi.string().optional(),
        shortCode: Joi.string().min(6).max(16).optional(),
        phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    }).custom((value, helpers) => {
        if (!value.tagId && !value.shortCode) {
            return helpers.error('any.custom', { message: 'Either tagId or shortCode is required' });
        }
        return value;
    })
};

exports.validateConfirmActivation = {
    body: Joi.object({
        tagId: Joi.string().optional(),
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
    })
};

// ==================== Messages ====================

exports.validateSubmitMessage = {
    body: Joi.object({
        shortCode: Joi.string().min(6).max(16).optional(),
        message: Joi.string().min(1).max(500).required(),
        reason: Joi.string().optional(),
        note: Joi.string().max(200).optional(),
        digits: Joi.string().optional(),
        callbackPhone: Joi.string().optional(),
    })
};

exports.validateRequestCallBack = {
    body: Joi.object({
        shortCode: Joi.string().min(6).max(16).optional(),
        reason: Joi.string().optional(),
        note: Joi.string().max(200).optional(),
        digits: Joi.string().optional(),
        callbackPhone: Joi.string().optional(),
    })
};

// ==================== Virtual Calls ====================

exports.validateInitiateCall = {
    body: Joi.object({
        visitorPhone: Joi.string().pattern(/^[+]?[\d\s-]{7,15}$/).required(),
        metadata: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
    })
};

exports.validateGetCallHistory = {
    query: Joi.object({
        shortCode: Joi.string().min(6).max(16).optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    })
};

// ==================== Affiliate Assignment ====================

exports.validateAssignToAffiliate = {
    body: Joi.object({
        affiliateId: Joi.string().required(),
        tagIds: Joi.array().items(Joi.string()).optional(),
        shortCodes: Joi.array().items(Joi.string().min(6).max(16)).optional(),
    }).custom((value, helpers) => {
        if ((!value.tagIds || value.tagIds.length === 0) && (!value.shortCodes || value.shortCodes.length === 0)) {
            return helpers.error('any.custom', { message: 'Either tagIds or shortCodes is required' });
        }
        return value;
    })
};

exports.validateGetAffiliateTags = {
    query: Joi.object({
        status: Joi.string().valid('generated', 'assigned', 'activated', 'archived').optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    })
};
