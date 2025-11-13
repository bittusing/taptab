'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const env = process.env;
const parseList = (value) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);

module.exports = {
  projectName: env.PROJECT_NAME || 'taptag-backend',
  ip: env.IP || '0.0.0.0',
  port: Number(env.PORT || 4000),
  logOnScreen: env.NODE_ENV !== 'production',
  root: process.cwd(),
  mongo: {
    uri: env.MONGO_URI || 'mongodb://localhost:27017/taptag',
    options: {},
  },
  seedDB: false,
  S3_REGION: env.S3_REGION,
  S3_BUCKET: env.S3_BUCKET,
  S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY,
  publicBaseUrl: env.PUBLIC_BASE_URL || 'https://taptab-77xa.onrender.com',
  adminApiKey: env.ADMIN_API_KEY || '',
  allowedOrigins: parseList(env.ALLOWED_ORIGINS),
  storefrontUrl: env.STOREFRONT_URL || 'https://taptab-77xa.onrender.com/buy',
  launchCity: env.LAUNCH_CITY || 'Lucknow',
  brandName: env.BRAND_NAME || 'TapTag',
  emergencyNumber: env.EMERGENCY_NUMBER || '112',
  support: {
    helpUrl: env.SUPPORT_HELP_URL || '',
    whatsapp: env.SUPPORT_WHATSAPP_URL || '',
    dashboardUrl: env.SUPPORT_DASHBOARD_URL || '',
    orderUrl: env.SUPPORT_ORDER_URL || '',
    shopUrl: env.SUPPORT_SHOP_URL || '',
    email: env.SUPPORT_EMAIL || '',
  },
  qr: {
    storage: env.QR_STORAGE_DRIVER || '',
    assetBaseUrl: env.QR_ASSET_BASE_URL || '',
    margin: Number(env.QR_MARGIN),
    scale: Number(env.QR_SCALE),
    darkColor: env.QR_DARK_COLOR || '',
    lightColor: env.QR_LIGHT_COLOR || '',
  },
  notification: {
    smsProvider: env.SMS_PROVIDER || 'none',
    whatsappProvider: env.WHATSAPP_PROVIDER || 'none',
    otpTtlMinutes: Number(env.OTP_TTL_MINUTES || 10),
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID || '',
      authToken: env.TWILIO_AUTH_TOKEN || '',
      messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID || '',
    },
    gupshup: {
      appName: env.GUPSHUP_APP_NAME || '',
      apiKey: env.GUPSHUP_API_KEY || '',
    },
  },
};

