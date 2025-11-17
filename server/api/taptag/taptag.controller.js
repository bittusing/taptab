const taptagService = require('./taptag.service');
const config = require('../../config/environment');

// ==================== Tag Management ====================

exports.generateBulk = (req, res, next) => {
    return taptagService
        .generateBulk(req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'Tags generated successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.list = (req, res, next) => {
    return taptagService
        .list(req.query, req.user)
        .then((result) => responseHandler.success(res, result, 'Tags listed successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.getSummary = (req, res, next) => {
    return taptagService
        .getSummary(req.query, req.user)
        .then((result) => responseHandler.success(res, result, 'Summary fetched successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.updateStatus = (req, res, next) => {
    const body = { ...req.body, shortCode: req.params.shortCode };
    return taptagService
        .updateStatus(body, req.user)
        .then((result) => responseHandler.success(res, result, 'Status updated successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

// ==================== Activation ====================

exports.requestOtp = (req, res, next) => {
    const body = { ...req.body, ip: req.ip };
    return taptagService
        .requestOtp(body, req.user)
        .then((result) => responseHandler.success(res, result, 'OTP sent successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.confirmActivation = (req, res, next) => {
    const body = { ...req.body, ip: req.ip };
    return taptagService
        .confirmActivation(body, req.user)
        .then((result) => responseHandler.success(res, result, 'Activation confirmed successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

// ==================== Messages ====================

exports.submitMessage = (req, res, next) => {
    const body = {
        ...req.body,
        shortCode: req.params.shortCode || req.body.shortCode,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    };
    return taptagService
        .submitMessage(body, req.user)
        .then((result) => responseHandler.success(res, result, 'Message delivered successfully!', 201))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.requestCallBack = (req, res, next) => {
    const body = {
        ...req.body,
        shortCode: req.params.shortCode || req.body.shortCode,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    };
    return taptagService
        .requestCallBack(body, req.user)
        .then((result) => responseHandler.success(res, result, 'Call-back request submitted successfully!', 202))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

// ==================== Virtual Calls ====================

exports.getVirtualNumber = (req, res, next) => {
    return taptagService
        .getVirtualNumber(req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'Virtual number fetched successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.initiateCall = (req, res, next) => {
    const body = {
        ...req.body,
        shortCode: req.params.shortCode || req.body.shortCode,
    };
    return taptagService
        .initiateCall(body, req.user)
        .then((result) => responseHandler.success(res, result, 'Call initiated successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.getCallHistory = (req, res, next) => {
    const query = {
        ...req.query,
        shortCode: req.params.shortCode || req.query.shortCode,
    };
    return taptagService
        .getCallHistory(query, req.user)
        .then((result) => responseHandler.success(res, result, 'Call history fetched successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

// ==================== Affiliate Assignment ====================

exports.assignToAffiliate = (req, res, next) => {
    return taptagService
        .assignToAffiliate(req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'Tags assigned to affiliate successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.getAffiliateTags = (req, res, next) => {
    return taptagService
        .getAffiliateTags(req.query, req.user)
        .then((result) => responseHandler.success(res, result, 'Affiliate tags fetched successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

// ==================== Webhooks ====================

exports.handleCallConnect = async (req, res) => {
    try {
        const { shortCode, visitorPhone, ownerPhone } = req.query;

        if (!shortCode || !visitorPhone || !ownerPhone) {
            return res.status(400).send('Missing required parameters');
        }

        const twilio = require('twilio');
        const response = new twilio.twiml.VoiceResponse();

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
        const twilio = require('twilio');
        const response = new twilio.twiml.VoiceResponse();
        response.say('Sorry, we encountered an error connecting your call.');
        response.hangup();
        res.type('text/xml');
        res.send(response.toString());
    }
};

exports.handleCallStatus = (req, res, next) => {
    const body = {
        callSid: req.body.CallSid,
        status: req.body.CallStatus,
        duration: req.body.CallDuration ? parseInt(req.body.CallDuration, 10) : 0,
        metadata: {
            from: req.body.From,
            to: req.body.To,
            direction: req.body.Direction,
        },
    };
    return taptagService
        .updateCallStatus(body, req.user)
        .then(() => res.status(200).send('OK'))
        .catch((error) => {
            (global).logger?.error?.({ error: error.message }, 'Error in call status webhook');
            res.status(200).send('OK');
        });
};

exports.handleDialStatus = async (req, res) => {
    try {
        const { shortCode, visitorPhone } = req.query;
        const { DialCallStatus, DialCallDuration } = req.body;

        const twilio = require('twilio');
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
        const twilio = require('twilio');
        const response = new twilio.twiml.VoiceResponse();
        response.say('Sorry, we encountered an error.');
        response.hangup();
        res.type('text/xml');
        res.send(response.toString());
    }
};
