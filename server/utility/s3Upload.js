const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');
const config = require('../config/environment');

// Generate UUID v4 using crypto (built-in, no external dependency)
function uuidv4() {
  return crypto.randomUUID();
}

let s3Client = null;
const s3Region = config.S3_REGION || process.env.S3_REGION;
const s3Bucket = config.S3_BUCKET || process.env.S3_BUCKET;

// Initialize S3 client only if credentials are available
if (s3Region && s3Bucket && config.S3_ACCESS_KEY_ID) {
  s3Client = new S3Client({
    region: s3Region,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
    },
  });
}

async function uploadFileToS3(file, folder = 'profile-pics') {
  try {
    // If S3 not configured, save locally as fallback (for development)
    if (!s3Client || !s3Bucket) {
      console.warn('S3 not configured, storing file reference locally');
      // Return a placeholder URL - in production, configure S3
      return `local://${folder}/${Date.now()}.jpg`;
    }

    // If file is base64, convert it
    let buffer, contentType, originalName;
    
    if (typeof file === 'string') {
      // Base64 string
      const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      contentType = file.match(/data:image\/(\w+);base64/)?.[1] || 'jpeg';
      originalName = `profile-${Date.now()}.${contentType}`;
    } else if (file && file.buffer) {
      // Multer file object
      buffer = file.buffer;
      contentType = file.mimetype || 'image/jpeg';
      originalName = file.originalname || `profile-${Date.now()}.jpg`;
    } else {
      throw new Error('Invalid file format');
    }

    const ext = path.extname(originalName) || `.${contentType.split('/')[1] || 'jpg'}`;
    const fileName = `${folder}/${uuidv4()}${ext}`;

    const uploadParams = {
      Bucket: s3Bucket,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      // ACL removed - bucket policy should handle public access instead
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    
    // Return the public URL
    const publicUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

module.exports = { uploadFileToS3 };

