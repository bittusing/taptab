const service = require('./user.service.js');

exports.sendOtpPhone = (req, res, next) => {
    return service
        .sendOtpPhone(req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'OTP sent successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.verifyOtp = (req, res, next) => { 
    return service
        .verifyOtp(req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'OTP verified successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
}

exports.uploadProfilePic = (req, res, next) => {
    // Support both multer file upload and base64 string
    const file = req.file || (req.body.profilePic ?
         { buffer: Buffer.from(req.body.profilePic.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
             mimetype: req.body.profilePic.match(/data:image\/(\w+);base64/)?.[1] || 'jpeg',
              originalname: 'profile.jpg' } : null);
    
    return service
        .uploadProfilePic(file, req.user)
        .then((result) => responseHandler.success(res, result, 'Profile picture uploaded successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
}

exports.updateProfile = (req, res, next) => {
    return service
        .updateProfile(req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'Profile updated successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
}

exports.createAdmin = (req, res, next) => {
    return service
        .createAdmin(req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'Admin created successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
}

exports.loginEmailPassword = (req, res, next) => {
    return service
        .loginEmailPassword(req.body)
        .then((result) => responseHandler.success(res, result, 'Login successful!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
}

exports.getRoleWiseUserList = (req, res, next) => {
    return service
        .getRoleWiseUserList(req.query.role || '', req.user)
        .then((result) => responseHandler.success(res, result, 'Role wise user list fetched successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
}

exports.getUserDetails = (req, res, next) => {
    return service
        .getUserDetails(req.params.id, req.user)
        .then((result) => responseHandler.success(res, result, 'User details fetched successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
}

exports.updateUserDetails = (req, res, next) => {
    return service
        .updateUserDetails(req.params.id, req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'User details updated successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
}

exports.deleteUser = (req, res, next) => {
    return service
        .deleteUser(req.params.id, req.user)
        .then((result) => responseHandler.success(res, result, 'User deleted successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
}