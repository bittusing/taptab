'use strict';

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const TapTag = require('../models/tapTag.model');
const TapTagUser = require('../models/tapTagUser.model');
const config = require('../../../config/environment');
const { generateQrImage } = require('../utils/qr.util');

const MAX_BULK_COUNT = 500;

const createIdentifiers = async () => {
  const tagId = uuidv4();
  const shortCode = crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
  const baseUrl = (config.publicBaseUrl || '').replace(/\/$/, '');
  const shortUrl = `${baseUrl}/r/${shortCode}`;
  const { qrUrl } = await generateQrImage({ shortCode, targetUrl: shortUrl });

  return {
    tagId,
    shortCode,
    shortUrl,
    qrUrl,
  };
};

const generateBulkTags = async ({ count, batchName, metadata = {}, generatedBy }) => {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('Count must be a positive integer');
  }

  if (count > MAX_BULK_COUNT) {
    throw new Error(`You can generate up to ${MAX_BULK_COUNT} tags in a single batch`);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const docs = await Promise.all(
      Array.from({ length: count }).map(async () => {
        const identifiers = await createIdentifiers();
        return {
          ...identifiers,
          status: 'generated',
          batchName: batchName || `batch-${new Date().toISOString().slice(0, 10)}`,
          metadata,
          generatedBy: generatedBy || null,
        };
      })
    );

    const result = await TapTag.insertMany(docs, { session });
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const listTags = async ({ status, search, batchName, page = 1, limit = 25 }) => {
  const query = {};
  if (status) {
    query.status = status;
  }

  if (batchName) {
    query.batchName = batchName;
  }

  if (search) {
    query.$or = [
      { tagId: { $regex: search, $options: 'i' } },
      { shortCode: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    TapTag.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo')
      .lean(),
    TapTag.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

const getDashboardSummary = async () => {
  const [totalTags, activeTags, archivedTags, messageCounts, userCount] = await Promise.all([
    TapTag.countDocuments(),
    TapTag.countDocuments({ status: 'activated' }),
    TapTag.countDocuments({ status: 'archived' }),
    TapTag.aggregate([
      {
        $lookup: {
          from: 'taptagmessages',
          localField: '_id',
          foreignField: 'tag',
          as: 'messages',
        },
      },
      { $unwind: '$messages' },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          lastMessageAt: { $max: '$messages.createdAt' },
        },
      },
    ]),
    TapTagUser.countDocuments({ isActive: true }),
  ]);

  const messagesSummary = messageCounts[0] || { total: 0, lastMessageAt: null };

  return {
    totalTags,
    activeTags,
    archivedTags,
    totalMessages: messagesSummary.total,
    lastMessageAt: messagesSummary.lastMessageAt,
    activeUsers: userCount,
  };
};

const updateStatus = async (shortCode, status) => {
  const allowedStatuses = ['generated', 'assigned', 'activated', 'archived'];
  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  const tag = await TapTag.findOneAndUpdate(
    { shortCode },
    { status },
    { new: true }
  );

  if (!tag) {
    throw new Error('Tag not found');
  }

  return tag;
};

module.exports = {
  generateBulkTags,
  listTags,
  getDashboardSummary,
  updateStatus,
};

