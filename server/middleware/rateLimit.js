'use strict';

const buckets = new Map();

/**
 * Basic in-memory rate limiter. Suitable for small deployments / demos.
 * @param {number} maxRequests - Number of allowed requests in the window.
 * @param {number} windowSeconds - Window size in seconds.
 */
const rateLimitByIp = (maxRequests = 10, windowSeconds = 60) => {
  const windowMs = windowSeconds * 1000;

  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > maxRequests) {
      res.set('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ message: 'Too many requests. Please retry later.' });
    }

    return next();
  };
};

module.exports = {
  rateLimitByIp,
};

