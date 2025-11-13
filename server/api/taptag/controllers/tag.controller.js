'use strict';

const {
  generateBulkSchema,
  listSchema,
  updateStatusSchema,
} = require('../validators/tag.validation');
const tagService = require('../services/tag.service');

const generateBulk = async (req, res) => {
  const { value, error } = generateBulkSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const created = await tagService.generateBulkTags({
    ...value,
    generatedBy: req.adminUserId || null,
  });

  return res.status(201).json({
    count: created.length,
    tags: created.map((tag) => ({
      tagId: tag.tagId,
      shortCode: tag.shortCode,
      shortUrl: tag.shortUrl,
      qrUrl: tag.qrUrl,
      status: tag.status,
      batchName: tag.batchName,
      createdAt: tag.createdAt,
    })),
  });
};

const list = async (req, res) => {
  const { value, error } = listSchema.validate(req.query);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const result = await tagService.listTags(value);
  return res.json(result);
};

const getSummary = async (req, res) => {
  const summary = await tagService.getDashboardSummary();
  return res.json(summary);
};

const updateStatus = async (req, res) => {
  const { value, error } = updateStatusSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const tag = await tagService.updateStatus(req.params.shortCode, value.status);
  return res.json({
    tagId: tag.tagId,
    shortCode: tag.shortCode,
    status: tag.status,
  });
};

module.exports = {
  generateBulk,
  list,
  getSummary,
  updateStatus,
};

