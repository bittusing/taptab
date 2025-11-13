// const Joi = require('joi');


// exports.validateVerifyOtp = Joi.object({
//   phone: Joi.string().pattern(/^[+]?[\d\s-]{7,15}$/).optional(),
//   email: Joi.string().email().optional(),
//   otp: Joi.string().length(6).required(),
// }).xor('email', 'phone').required();

// // Basic signin validation (email or phone with password)
// exports.validateSignIn = Joi.object({
//   email: Joi.string().email().optional(),
//   phone: Joi.string().pattern(/^[+]?[\d\s-]{7,15}$/).optional(),
//   googleToken:Joi.string().optional(),
//   deviceToken:Joi.string().optional(), // for fmc notification
//   deviceInfo:Joi.object().optional(),  
// }).xor('email', 'phone').required();





const Joi = require('joi'),
  { USER_ROLES } = require("../../config/constants");
Joi.objectId = require('joi-objectid')(Joi);



exports.validateLogIn = {
  body: Joi.object({
    email: Joi.string()
      .messages({
        'string.base': 'email must be a string',
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
      })
      .email(),
    deviceToken:Joi.string().allow('', null).optional(),
    googleToken:Joi.string().allow('', null).optional(),
    phone: Joi.string()
      .pattern(/^[+]?[\d\s-]+$/)
      .messages({
        'string.base': 'phone must be a string',
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Please provide a valid phone number',
      }),

      deviceInfo: Joi.object().optional(),


  })
    .xor('email', 'phone')
    .required()
    .messages({
      'object.xor': 'Please provide either email or phone number',
      'object.missing': 'Please provide valid login credentials',
    }),
};
