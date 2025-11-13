'use strict';

const express = require('express');
const publicController = require('../controllers/public.controller');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    message: 'TapTag backend is running. Scan a TapTag QR or NFC tag to contact a vehicle owner.',
  });
});
router.get('/r/:shortCode', publicController.renderTagPage);
router.post('/r/:shortCode/message', publicController.handleTagMessage);
router.post('/r/:shortCode/call-request', publicController.handleCallRequest);

router.get('/thanks', publicController.renderThankYou);
router.get('/privacy', publicController.renderPrivacy);
router.get('/terms', publicController.renderTerms);

module.exports = router;

