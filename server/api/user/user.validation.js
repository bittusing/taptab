const Joi = require('joi');

// Verify OTP validation - joiValidate expects { body: schema }
exports.validateVerifyOtp = {
    body: Joi.object({
        phone: Joi.string().pattern(/^[+]?[\d\s-]{7,15}$/).optional(),
        email: Joi.string().email().optional(),
        otp: Joi.string().length(6).required(),
    })
        .xor('email', 'phone').required()
};

// Send OTP validation
exports.validateSendOtp = {
    body: Joi.object({
        phone: Joi.string().pattern(/^[+]?[\d\s-]{7,15}$/).optional(),
        email: Joi.string().email().optional(),
    })
        .xor('email', 'phone').required()
};

// Update profile validation
exports.validateUpdateProfile = {
    body: Joi.object({
        name: Joi.string().optional(),
        email: Joi.string().email().optional(),
        phone: Joi.string().pattern(/^[+]?[\d\s-]{7,15}$/).optional(),
        bio: Joi.string().optional(),
        skills: Joi.array().items(Joi.string()).optional(),
        github: Joi.string().uri().optional(),
        linkedin: Joi.string().uri().optional(),
        portfolio: Joi.string().uri().optional(),
        college: Joi.string().optional(),
        course: Joi.string().optional(),
        semester: Joi.string().optional().allow(''),
        technologies: Joi.array().items(Joi.string()).optional(),
        TutorSpecificFields: Joi.object({
            verified: Joi.boolean().optional(),
            rating: Joi.number().optional(),
            totalCourses: Joi.number().optional(),
            totalStudents: Joi.number().optional(),
            totalEarnings: Joi.number().optional(),
            commissionRate: Joi.number().optional(),
            specialization: Joi.array().items(Joi.string()).optional(),
            certifications: Joi.array().items(Joi.string()).optional(),     
        }).optional(),
        password: Joi.string().optional().allow(''),
    })
};


exports.validateCreateAdmin = {
    body: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        phone: Joi.string().pattern(/^[+]?[\d\s-]{7,15}$/).required(),
        password: Joi.string().required(),
        role: Joi.string().valid('Super Admin', 'Support Admin', 'Admin', 'Tutor', 'Employee',
            'HR', 'Finance', 'Project Manager', 'Sales').required(),
        isActive: Joi.boolean().required(),
    })
};

exports.validateLoginEmailPassword = {
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    })
};

exports.validateGetRoleWiseUserList = {
    params: Joi.object({
        role: Joi.string().valid('Super Admin', 'Support Admin', 'Admin', 'Tutor', 'Employee',
            'HR', 'Finance', 'Project Manager', 'Sales').required(),
    })
};
