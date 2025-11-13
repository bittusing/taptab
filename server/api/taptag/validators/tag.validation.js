'use strict';

const Joi = require('joi');

const generateBulkSchema = Joi.object({
  count: Joi.number().integer().min(1).max(500).required(),
  batchName: Joi.string().max(64).optional(),
  metadata: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});

const listSchema = Joi.object({
  status: Joi.string().valid('generated', 'assigned', 'activated', 'archived').optional(),
  search: Joi.string().max(50).optional(),
  batchName: Joi.string().max(64).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('generated', 'assigned', 'activated', 'archived').required(),
});

module.exports = {
  generateBulkSchema,
  listSchema,
  updateStatusSchema,
};

