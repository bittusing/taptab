'use strict';

const twilio = require('twilio');
const config = require('../../../config/environment');
const virtualCallService = require('../services/virtualCall.service');
const TapTag = require('../models/tapTag.model');

const handleCallConnect = async (req, res) => {
  try {
    const { shortCode, visitorPhone, ownerPhone } = req.query;

    if (!shortCode || !visitorPhone || !ownerPhone) {
      return res.status(400).send('Missing required parameters');
    }

    const response = new twilio.twiml.VoiceResponse();

    // Dial the owner's phone number
    const dial = response.dial({
      callerId: config.notification.twilio.phoneNumber,
      record: false,
      timeout: 30,
      action: `${config.publicBaseUrl}/api/v1/call/dial-status?shortCode=${shortCode}&visitorPhone=${encodeURIComponent(visitorPhone)}`,
      method: 'POST',
    });

    dial.number(ownerPhone);

    res.type('text/xml');
    res.send(response.toString());
  } catch (error) {
    (global).logger?.error?.({ error: error.message }, 'Error in call connect webhook');
    const response = new twilio.twiml.VoiceResponse();
    response.say('Sorry, we encountered an error connecting your call.');
    response.hangup();
    res.type('text/xml');
    res.send(response.toString());
  }
};

const handleCallStatus = async (req, res) => {
  try {
    const {
      CallSid,
      CallStatus,
      CallDuration,
      From,
      To,
      Direction,
    } = req.body;

    const statusMap = {
      queued: 'initiated',
      ringing: 'ringing',
      'in-progress': 'in-progress',
      completed: 'completed',
      busy: 'busy',
      'no-answer': 'no-answer',
      canceled: 'canceled',
      failed: 'failed',
    };

    const mappedStatus = statusMap[CallStatus] || CallStatus;

    await virtualCallService.updateCallStatus({
      callSid: CallSid,
      status: mappedStatus,
      duration: CallDuration ? parseInt(CallDuration, 10) : 0,
      metadata: {
        from: From,
        to: To,
        direction: Direction,
      },
    });

    res.status(200).send('OK');
  } catch (error) {
    (global).logger?.error?.({ error: error.message }, 'Error in call status webhook');
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
};

const handleDialStatus = async (req, res) => {
  try {
    const { shortCode, visitorPhone } = req.query;
    const { DialCallStatus, DialCallDuration } = req.body;

    const response = new twilio.twiml.VoiceResponse();

    if (DialCallStatus === 'completed' || DialCallStatus === 'answered') {
      response.say('Call connected. You can now speak with the vehicle owner.');
    } else if (DialCallStatus === 'busy') {
      response.say('The owner is currently busy. Please try again later.');
    } else if (DialCallStatus === 'no-answer') {
      response.say('The owner did not answer. Please try again later.');
    } else {
      response.say('Sorry, we could not connect your call. Please try again later.');
    }

    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  } catch (error) {
    (global).logger?.error?.({ error: error.message }, 'Error in dial status webhook');
    const response = new twilio.twiml.VoiceResponse();
    response.say('Sorry, we encountered an error.');
    response.hangup();
    res.type('text/xml');
    res.send(response.toString());
  }
};

module.exports = {
  handleCallConnect,
  handleCallStatus,
  handleDialStatus,
};

