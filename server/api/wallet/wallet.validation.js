const Joi = require('joi');

exports.validateWithdrawalRequest = Joi.object({
    amount: Joi.number().positive().required(),
    notes: Joi.string().allow('', null),
});

exports.validateTransactionStatus = Joi.object({
    status: Joi.string().valid('pending', 'completed', 'cancelled').required(),
    notes: Joi.string().allow('', null),
});

exports.validateManualCredit = Joi.object({
    userId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    description: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
    saleId: Joi.string().allow('', null),
});

