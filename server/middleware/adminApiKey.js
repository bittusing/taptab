'use strict';

const config = require('../config/environment');

module.exports = function adminApiKey(req, res, next) {
  const headerKey = req.headers['x-admin-key'] || req.headers['x-api-key'];

  if (!config.adminApiKey) {
    (global).logger?.warn?.('ADMIN_API_KEY is not configured. Skipping admin key validation.');
    return next();
  }

  if (!headerKey || headerKey !== config.adminApiKey) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return next();
};

