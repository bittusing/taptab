'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const OTP_LENGTH = 6;
const SALT_ROUNDS = 10;

const generateOtp = () => {
  const buffer = crypto.randomBytes(4);
  const otp = (buffer.readUInt32BE() % 10 ** OTP_LENGTH).toString();
  return otp.padStart(OTP_LENGTH, '0');
};

const hashOtp = async (otp) => bcrypt.hash(otp, SALT_ROUNDS);

const verifyOtp = async (otp, hash) => bcrypt.compare(otp, hash);

const hashIp = (ip) => {
  const secret = process.env.IP_HASH_SECRET || 'taptag-ip-secret';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(ip || 'unknown');
  return hmac.digest('hex');
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  hashIp,
};

