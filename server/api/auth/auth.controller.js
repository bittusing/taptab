const service = require('./auth.service');

exports.sendOtpPhone = (req, res, next) => {
    return service
        .sendOtpPhone(req.body, res, next)
        .then((result) => responseHandler.success(res, result, 'OTP sent successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.verifyOtp = (req, res, next) => {
    return service
        .verifyOtp(req.body, res, next)
        .then((result) => responseHandler.success(res, result, 'OTP verified successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.signIn = (req, res, next) => {
    return service
        .signIn(req.body, res, next)
        .then((result) => responseHandler.success(res, result, 'User signed in successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.refresh = (req, res, next) => {
    return service.refresh(req.body, req.headers.refresh)
        .then((result) => responseHandler.success(res, result, 'Token refreshed successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};


