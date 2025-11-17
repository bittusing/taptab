const crypto = require("crypto")
const config = require('../config/environment');

exports.getHashedPassword = (password, salt) => {
    return crypto.createHash("sha512").update(password + salt).digest("hex");
}

exports.getHashedOtp = (otp, salt) => {
    return crypto.createHash("sha512").update(otp + salt).digest("hex");
}

exports.generateSalt = () => {
    return crypto.randomBytes(16).toString("base64");
}

exports.generateCompanyCode = () => {
    const timestamp = Date.now().toString();
    return `COM${timestamp.slice(-6)}`;
  };

exports.generatePassword = () => {
    var length = 6,
        charset = "ab78cdef05ghi34jklmnopqr12stuvwxyz69",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

exports.generateOTP = (len = 6) => {
    var length = len,
        charset = "1234567890",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

// Phone Encryption Functions
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length

const getEncryptionKey = () => {
    const secret = process.env.PHONE_ENCRYPTION_SECRET || config.phoneEncryption?.secret;
    
    if (!secret) {
        throw new Error('PHONE_ENCRYPTION_SECRET is not configured. Please set it in .env file.');
    }

    if (secret.length < 32) {
        throw new Error('PHONE_ENCRYPTION_SECRET must be at least 32 characters long');
    }

    return Buffer.from(secret.slice(0, 32), 'utf8');
};

exports.encryptPhone = (phone) => {
    if (!phone) {
        return null;
    }

    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(phone, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag();

        const combined = Buffer.concat([
            iv,
            authTag,
            Buffer.from(encrypted, 'base64'),
        ]);

        return combined.toString('base64');
    } catch (error) {
        (global).logger?.error?.({ error: error.message }, 'Failed to encrypt phone number');
        throw new Error(`Phone encryption failed: ${error.message}`);
    }
};

exports.decryptPhone = (encryptedPhone) => {
    if (!encryptedPhone) {
        return null;
    }

    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encryptedPhone, 'base64');

        const iv = combined.slice(0, IV_LENGTH);
        const authTag = combined.slice(IV_LENGTH, IV_LENGTH + 16);
        const encrypted = combined.slice(IV_LENGTH + 16);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        (global).logger?.error?.({ error: error.message }, 'Failed to decrypt phone number');
        throw new Error(`Phone decryption failed: ${error.message}`);
    }
};

exports.formatPhoneForTel = (phone) => {
    if (!phone) {
        return null;
    }

    let formatted = phone.replace(/[\s\-\(\)]/g, '');

    if (!formatted.startsWith('+')) {
        if (formatted.startsWith('0')) {
            formatted = '+91' + formatted.slice(1);
        } else if (formatted.length === 10) {
            formatted = '+91' + formatted;
        } else {
            formatted = '+' + formatted;
        }
    }

    return formatted;
};

exports.maskPhoneForLogging = (phone) => {
    if (!phone) {
        return '[NO_PHONE]';
    }

    const digits = phone.replace(/[^\d+]/g, '');
    
    if (digits.length <= 4) {
        return 'XXXX';
    }

    const last4 = digits.slice(-4);
    const countryCode = digits.startsWith('+') ? digits.match(/^\+\d{1,3}/)?.[0] || '+XX' : '';
    const masked = 'X'.repeat(Math.max(0, digits.length - (countryCode.length + 4)));

    return countryCode + masked + last4;
};

exports.hashPhoneForLogging = (phone) => {
    if (!phone) {
        return '[NO_PHONE]';
    }

    const hash = crypto.createHash('sha256').update(phone).digest('hex');
    return hash.slice(0, 8).toUpperCase();
};