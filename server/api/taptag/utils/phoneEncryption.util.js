'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

const getEncryptionKey = () => {
  const secret = process.env.PHONE_ENCRYPTION_SECRET || 'taptag-phone-encryption-secret-change-in-production';
  return crypto.scryptSync(secret, 'salt', 32);
};

const encryptPhone = (phone) => {
  if (!phone) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(phone, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    (global).logger?.error?.({ error: error.message }, 'Failed to encrypt phone number');
    throw new Error('Failed to encrypt phone number');
  }
};

const decryptPhone = (encryptedPhone) => {
  if (!encryptedPhone) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedPhone.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted phone format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    (global).logger?.error?.({ error: error.message }, 'Failed to decrypt phone number');
    throw new Error('Failed to decrypt phone number');
  }
};

const formatPhoneForTel = (phone) => {
  if (!phone) {
    return null;
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with country code (India: +91)
  if (cleaned.startsWith('0')) {
    return `+91${cleaned.substring(1)}`;
  }
  
  // If doesn't start with +, assume it's Indian number and add +91
  if (!cleaned.startsWith('+')) {
    return `+91${cleaned}`;
  }
  
  return phone;
};

module.exports = {
  encryptPhone,
  decryptPhone,
  formatPhoneForTel,
};

