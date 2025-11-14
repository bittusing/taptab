'use strict';

const virtualCallService = require('../services/virtualCall.service');

const initiateCall = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { visitorPhone, metadata } = req.body;

    if (!visitorPhone) {
      return res.status(400).json({ message: 'visitorPhone is required' });
    }

    const result = await virtualCallService.initiateCall({
      shortCode,
      visitorPhone,
      metadata,
    });

    return res.status(200).json({
      message: 'Call initiated successfully',
      ...result,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getCallHistory = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const result = await virtualCallService.getCallHistory({
      shortCode,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
    });

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getVirtualNumber = async (req, res) => {
  try {
    const virtualNumber = virtualCallService.getVirtualNumber();
    return res.json({
      virtualNumber,
      message: 'Use this number to call. Your number will be masked.',
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  initiateCall,
  getCallHistory,
  getVirtualNumber,
};

