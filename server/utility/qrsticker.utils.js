'use strict';

const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');
const sharp = require('sharp');
const config = require('../config/environment');
const { uploadFileToS3 } = require('./s3Upload');

const DEFAULT_MARGIN = 1;
const DEFAULT_SCALE = 8;
const DEFAULT_DARK_COLOR = '#000000ff';
const DEFAULT_LIGHT_COLOR = '#ffffffff';

// Sticker template configuration
const STICKER_TEMPLATE_PATH = path.join(config.root, 'server', 'public', 'stickerTemplate', 'qrsticker.png');
// QR code position on template (left side white square area)
// These values can be adjusted based on actual template dimensions
const QR_POSITION = {
  x: 50,   // Left margin from template edge
  y: 50,   // Top margin from template edge
  size: 400, // QR code size in pixels (will be resized to fit)
};

const ensureDirectory = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const generateQrBuffer = async (content) => {
  const options = config.qr || {};
  const margin = Number.isFinite(options.margin) ? options.margin : DEFAULT_MARGIN;
  const scale = Number.isFinite(options.scale) ? options.scale : DEFAULT_SCALE;
  const darkColor = options.darkColor || DEFAULT_DARK_COLOR;
  const lightColor = options.lightColor || DEFAULT_LIGHT_COLOR;

  return QRCode.toBuffer(content, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin,
    scale,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });
};

const saveLocal = async (buffer, fileName, subfolder = 'qr') => {
  const baseUploadsDir = path.join(config.root, 'uploads');
  const targetDir = path.join(baseUploadsDir, subfolder);
  await ensureDirectory(targetDir);
  await fs.writeFile(path.join(targetDir, fileName), buffer);

  const defaultAssetBase = `${(config.publicBaseUrl || '').replace(/\/$/, '')}/api/static`;
  const assetBase = (config.qr && config.qr.assetBaseUrl) || defaultAssetBase;
  return `${assetBase.replace(/\/$/, '')}/${subfolder}/${fileName}`;
};

const saveToS3 = async (buffer, fileName, subfolder = 'qr') => {
  return uploadFileToS3(
    {
      buffer,
      mimetype: 'image/png',
      originalname: fileName,
    },
    subfolder
  );
};

const persistQr = async (buffer, fileName, subfolder = 'qr') => {
  const storage = (config.qr && config.qr.storage) || (config.S3_BUCKET ? 's3' : 'local');

  if (storage === 's3') {
    try {
      return await saveToS3(buffer, fileName, subfolder);
    } catch (error) {
      console.error('Failed to upload to S3, falling back to local storage', error);
    }
  }

  return saveLocal(buffer, fileName, subfolder);
};

/**
 * Generate QR code and composite it onto sticker template
 * @param {Object} params - Generation parameters
 * @param {string} params.shortCode - Unique short code for the tag
 * @param {string} params.targetUrl - URL to encode in QR code
 * @returns {Promise<Object>} Object containing qrUrl, stickerUrl, and fileName
 */
const generateQrImage = async ({ shortCode, targetUrl }) => {
  if (!shortCode) {
    throw new Error('shortCode is required to generate QR');
  }
  if (!targetUrl) {
    throw new Error('targetUrl is required to generate QR');
  }

  try {
    // 1. Generate QR code buffer
    const qrBuffer = await generateQrBuffer(targetUrl);

    // 2. Check if template file exists and get its dimensions
    let templateBuffer;
    let templateMetadata;
    try {
      templateBuffer = await fs.readFile(STICKER_TEMPLATE_PATH);
      templateMetadata = await sharp(templateBuffer).metadata();
    } catch (error) {
      console.error('Sticker template not found, generating QR only:', error.message);
      // Fallback to QR only if template not found
      const fileName = `${shortCode}.png`;
      const qrUrl = await persistQr(qrBuffer, fileName);
      return {
        qrUrl,
        stickerUrl: qrUrl, // Same as qrUrl if no template
        fileName,
      };
    }

    // 3. Calculate safe QR code size based on template dimensions
    const templateWidth = templateMetadata.width;
    const templateHeight = templateMetadata.height;
    
    // Calculate available space (template size minus position and some padding)
    const availableWidth = templateWidth - QR_POSITION.x - 50; // 50px right padding
    const availableHeight = templateHeight - QR_POSITION.y - 50; // 50px bottom padding
    
    // Use the smaller dimension to ensure QR fits
    const maxQrSize = Math.min(availableWidth, availableHeight, QR_POSITION.size);
    const qrSize = Math.max(100, maxQrSize); // Minimum 100px, maximum based on available space

    // 4. Resize QR code to fit template area
    const resizedQrBuffer = await sharp(qrBuffer)
      .resize(qrSize, qrSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer();

    // 5. Verify QR dimensions don't exceed template bounds
    const qrMetadata = await sharp(resizedQrBuffer).metadata();
    if (QR_POSITION.x + qrMetadata.width > templateWidth || 
        QR_POSITION.y + qrMetadata.height > templateHeight) {
      throw new Error(`QR code dimensions (${qrMetadata.width}x${qrMetadata.height}) exceed template bounds at position (${QR_POSITION.x}, ${QR_POSITION.y})`);
    }

    // 6. Composite QR code onto template
    const stickerBuffer = await sharp(templateBuffer)
      .composite([
        {
          input: resizedQrBuffer,
          top: QR_POSITION.y,
          left: QR_POSITION.x,
        },
      ])
      .png()
      .toBuffer();

    // 7. Save sticker
    const stickerFileName = `sticker-${shortCode}.png`;
    const stickerUrl = await persistQr(stickerBuffer, stickerFileName, 'stickers');

    // 8. Also save QR only (optional, for backward compatibility)
    const qrFileName = `${shortCode}.png`;
    const qrUrl = await persistQr(qrBuffer, qrFileName);

    return {
      qrUrl,
      stickerUrl,
      fileName: stickerFileName,
    };
  } catch (error) {
    console.error('Error generating QR sticker:', error);
    throw new Error(`Failed to generate QR sticker: ${error.message}`);
  }
};

module.exports = {
  generateQrImage,
};

