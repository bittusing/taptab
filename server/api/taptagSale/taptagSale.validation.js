const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

exports.validateSaleCreate = {
    body: Joi.object({
        tagId: Joi.objectId().required(),
        salesPersonId: Joi.objectId().required(),
        ownerId: Joi.objectId().required(),
        saleDate: Joi.date().required(),
        saleType: Joi.string().valid('online', 'offline', 'not-confirmed').optional().default('not-confirmed'),
        totalSaleAmount: Joi.number().optional().default(0),
        commisionAmountOfSalesPerson: Joi.number().optional().default(0),
        commisionAmountOfOwner: Joi.number().optional().default(0),
        castAmountOfProductAndServices: Joi.number().optional().default(0),
        paymentStatus: Joi.string().valid('pending', 'completed', 'cancelled').required(),
        varificationStatus: Joi.string().valid('pending', 'completed', 'cancelled').required(),
        message: Joi.array().items(
            Joi.object({
                message: Joi.string().optional().allow(null, '')
            })
        ).optional().default([]),
        paymentImageOrScreenShot: Joi.string().optional().allow(null, ''),
        createdAt: Joi.date().optional(),
        updatedAt: Joi.date().optional().allow(null),
    }),
};

exports.validateSaleUpdate = {
    body: Joi.object({
        tagId: Joi.objectId().required(),
        salesPersonId: Joi.objectId().required(),
        ownerId: Joi.objectId().required(),
        saleDate: Joi.date().required(),
        saleType: Joi.string().valid('online', 'offline', 'not-confirmed').optional().default('not-confirmed'),
        totalSaleAmount: Joi.number().optional().default(0),
        commisionAmountOfSalesPerson: Joi.number().optional().default(0),
        commisionAmountOfOwner: Joi.number().optional().default(0),
        castAmountOfProductAndServices: Joi.number().optional().default(0),
        paymentStatus: Joi.string().valid('pending', 'completed', 'cancelled').required(),
        varificationStatus: Joi.string().valid('pending', 'completed', 'cancelled').required(),
        message: Joi.array().items(
            Joi.object({
                message: Joi.string().optional().allow(null, '')
            })
        ).optional().default([]),
        paymentImageOrScreenShot: Joi.string().optional().allow(null, ''),
        createdAt: Joi.date().optional(),
        updatedAt: Joi.date().optional().allow(null),
    }),
};