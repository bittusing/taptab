'use strict';

const express = require('express');
const { joiValidate } = require('../../helpers/apiValidation.helper.js');
const controller = require('./user.controller.js');
const {validateSendOtp, validateVerifyOtp, validateUpdateProfile ,
     validateCreateAdmin, validateLoginEmailPassword,
      validateGetRoleWiseUserList , validateCreateAffiliateUser, validateUpdateAffiliateUser,
      validateGetAffiliateListWithStats } = require('./user.validation.js');
const authService = require('../auth/auth.service.js');
const uploadImage = require('../../config/multer.image.config.js');
const router = express.Router();
const base = '/v1';
const options = {
    wantResponse: true,
};

// Send OTP - public endpoint (no auth required)
router.post(base + '/auth/send-otp', 
    authService.isAuthenticated({role: ['User','Admin','Super Admin','Support Admin'] }),
    joiValidate(validateSendOtp, options), controller.sendOtpPhone);

// Verify OTP - requires authentication (user must be logged in to verify OTP)
router.post(base + '/auth/verify-otp', 
    authService.isAuthenticated({role: ['User','Admin','Super Admin','Support Admin', 'Tutor', 'Employee','HR','Finance','Project Manager', 'Sales'] }), 
    joiValidate(validateVerifyOtp), controller.verifyOtp); 

// Upload profile pic - accepts multipart/form-data with 'profilePic' field or base64 in body
router.post(base + '/user/upload-profile-pic', 
    authService.isAuthenticated({role: ['User','Admin','Super Admin','Support Admin'] }),
    uploadImage.single('profilePic'),
    controller.uploadProfilePic); 

// Update user profile
router.put(base + '/user/update-profile', 
    authService.isAuthenticated({role: ['User','Tutor','Admin','Super Admin','Support Admin'] }),
    joiValidate(validateUpdateProfile),
    controller.updateProfile); 

/////  super admin, support admin, admin, tutor,
//  employee, hr, finance, project manager, sales, create api with password and email
router.post(base + '/user/create-admin', 
 //   authService.isAuthenticated({role: ['Super Admin','Support Admin'] }),
    joiValidate(validateCreateAdmin),
    controller.createAdmin); 


///// login api with email and password
router.post(base + '/auth/login', 
    joiValidate(validateLoginEmailPassword),
    controller.loginEmailPassword); 


//// get role wise user list   
router.get(base + '/user/get-role-wise-user-list', 
    authService.isAuthenticated({ role: ['Super Admin','Support Admin',
        'Admin','Tutor','Employee','HR','Finance','Project Manager','Sales'] }),
    // joiValidate(validateGetRoleWiseUserList),
    controller.getRoleWiseUserList); 

//////// list of admin , support admin, super admin, affiliate  
router.get(base + '/user/list-of-admin-support-admin-super-admin-affiliate-list',
    authService.isAuthenticated({ role: ['Super Admin','Support Admin','Admin'] }),
    controller.listOfAdminSupportAdminSuperAdminAffiliate);

//////// Affiliate list with sales stats
router.get(base + '/user/affiliate-list-with-stats',
    authService.isAuthenticated({ role: ['Super Admin','Support Admin','Admin'] }),
    // joiValidate(validateGetAffiliateListWithStats),
    controller.getAffiliateListWithStats);

////// create Affiliate user by admin or super admin or support admin
router.post(base + '/user/create-affiliate-user',
    authService.isAuthenticated({ role: ['Super Admin','Support Admin', 'Admin'] }),
    joiValidate(validateCreateAffiliateUser),
    controller.createAffiliateUser);

////// update Affiliate user by admin or super admin or support admin
router.put(base + '/user/affiliate/:id',
    authService.isAuthenticated({ role: ['Super Admin','Support Admin', 'Admin'] }),
    joiValidate(validateUpdateAffiliateUser),
    controller.updateAffiliateUser);
///////// tag owner assign to affiliate
    router.get(base + '/user/tag-assign-to-affiliate/:id',
        authService.isAuthenticated({ role: ['Super Admin','Support Admin', 'Admin' , 'Affiliate'] }),
        // joiValidate(validateUpdateAffiliateUser),
        controller.tagAssignToAffiliate);    

/// get particular user details
router.get(base + '/user/:id',
    /////no need role only auth token is required
    authService.isAuthenticated({}),
    controller.getUserDetails);

// update user details
router.put(base + '/user/:id',
    /////no need role only auth token is required
    authService.isAuthenticated({}),
    controller.updateUserDetails);


    

// delete user
// router.delete(base + '/user/:id',
//     /////no need role only auth token is required
//     authService.isAuthenticated({}),
//     controller.deleteUser);

     




module.exports = router;

