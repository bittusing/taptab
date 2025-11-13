'use strict';

const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');
const config = require('../../../config/environment');
const { uploadFileToS3 } = require('../../../utility/s3Upload');

const DEFAULT_MARGIN = 1;
const DEFAULT_SCALE = 8;
const DEFAULT_DARK_COLOR = '#000000ff';
const DEFAULT_LIGHT_COLOR = '#ffffffff';

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

const saveLocal = async (buffer, fileName) => {
  const baseUploadsDir = path.join(config.root, 'uploads');
  const qrDir = path.join(baseUploadsDir, 'qr');
  await ensureDirectory(qrDir);
  await fs.writeFile(path.join(qrDir, fileName), buffer);

  const defaultAssetBase = `${(config.publicBaseUrl || '').replace(/\/$/, '')}/api/static`;
  const assetBase = (config.qr && config.qr.assetBaseUrl) || defaultAssetBase;
  return `${assetBase.replace(/\/$/, '')}/qr/${fileName}`;
};

const saveToS3 = async (buffer, fileName) => {
  return uploadFileToS3(
    {
      buffer,
      mimetype: 'image/png',
      originalname: fileName,
    },
    'qr'
  );
};

const persistQr = async (buffer, fileName) => {
  const storage = (config.qr && config.qr.storage) || (config.S3_BUCKET ? 's3' : 'local');

  if (storage === 's3') {
    try {
      return await saveToS3(buffer, fileName);
    } catch (error) {
      console.error('Failed to upload QR to S3, falling back to local storage', error);
    }
  }

  return saveLocal(buffer, fileName);
};

const generateQrImage = async ({ shortCode, targetUrl }) => {
  if (!shortCode) {
    throw new Error('shortCode is required to generate QR');
  }
  if (!targetUrl) {
    throw new Error('targetUrl is required to generate QR');
  }

  const buffer = await generateQrBuffer(targetUrl);
  const fileName = `${shortCode}.png`;
  const qrUrl = await persistQr(buffer, fileName);

  return {
    qrUrl,
    fileName,
  };
};

module.exports = {
  generateQrImage,
};


