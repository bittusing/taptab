
/**
 * Express configuration
 */

'use strict';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const config = require('./environment');

const allowedOrigins = (config.allowedOrigins && config.allowedOrigins.length > 0)
  ? config.allowedOrigins
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:9000',
      'https://taptag.in',
      'https://taptagdashboard.vercel.app'
    ];

module.exports = function (app) {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: function (origin, callback) {
      // allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  app.use('/api/static', express.static(path.join(__dirname, '../', 'uploads')));
  app.use('/api/temp', express.static(path.join(__dirname, '../', 'temp')));
  app.use('/assets', express.static(path.join(__dirname, '../', 'public')));
  app.use(compression());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json({
    limit: '10mb',
    verify: function (req, res, buf) {
      req.rawBody = buf; // get rawBody
    }
  }));

  app.use(methodOverride());
  app.use(cookieParser());
};

