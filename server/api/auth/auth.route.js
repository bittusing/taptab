const express = require('express');
const { joiValidate } = require('../../helpers/apiValidation.helper.js');
const controller = require('./auth.controller.js');
const {validateLogIn} = require('./auth.validation.js');
options = {
    wantResponse: true,
};

const router = express.Router();
const base = '/v1';

// Start page phone OTP

// Optional email/phone + password signin
router.post(base + '/auth/signin', joiValidate(validateLogIn), controller.signIn);

router.post(base + "/refresh",
    controller.refresh);


module.exports = router;

