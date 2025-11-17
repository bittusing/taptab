const UserModel = require('./user.model');
const TapTagSale = require('../taptagSale/taptagSale.model');
const TapTag = require('../taptag/models/tapTag.model');
const { getHashedOtp, generateOTP, generateSalt } = require('../../utility/util');
const { uploadFileToS3 } = require('../../utility/s3Upload');
const authService = require('../auth/auth.service');
const bcrypt = require('bcrypt');
exports.findOne = (query) => {
  return UserModel.findOne(query);
};

exports.sendOtpPhone = async ({ phone, email }, user) => {
  if (phone) {
    let user = await UserModel.findOne({ phone });
    if (!user) {
      user = await UserModel.create({ phone });
    }
    const otp = generateOTP(6);
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // 1 minutes
    const salt = generateSalt();
    const hashedOtp = getHashedOtp(otp, salt);
    await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        otp: hashedOtp,
        hashSalt: salt,
        otpExpiry: expiresAt,
        isMobileVerified: false,
      }
    });
    return { phone, otpSent: true, otp: otp }; // Don't return OTP for security
  }
  if (email) {
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({ email });
    }
    const otp = generateOTP(6);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const salt = generateSalt();
    const hashedOtp = getHashedOtp(otp, salt);
    await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        otp: hashedOtp,
        hashSalt: salt,
        otpExpiry: expiresAt,
        isEmailVerified: false
      }
    });
    return { email, otpSent: true, otp: otp }; // Don't return OTP for security
  }
  throw new Error('Either phone or email is required');
};

exports.verifyOtp = async ({ phone, email, otp }, reqUser) => {
  if (phone) {
    let user = await UserModel.findOne({ phone });
    if (!user) throw new Error('User not found');
    if (!user.otpExpiry || new Date(user.otpExpiry) < new Date()) throw new Error('OTP expired');
    const salt = user.hashSalt;
    const hashedOtp = getHashedOtp(otp, salt);
    if (user.otp !== hashedOtp) throw new Error('Invalid OTP');

    // Update with { new: true } to get updated document, and also clear OTP fields
    user = await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        isMobileVerified: true
      },
      $unset: {
        otp: '',
        otpExpiry: '',
        hashSalt: ''
      }
    }, { new: true });

    return user || {};
  }
  if (email) {
    const user = await UserModel.findOne({ email });
    if (!user) throw new Error('User not found');
    if (!user.otpExpiry || new Date(user.otpExpiry) < new Date()) throw new Error('OTP expired');
    const salt = user.hashSalt;
    const hashedOtp = getHashedOtp(otp, salt);
    if (user.otp !== hashedOtp) throw new Error('Invalid OTP');

    // Update with { new: true } to get updated document
    const updatedUser = await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        isEmailVerified: true
      },
      $unset: {
        otp: '',
        otpExpiry: '',
        hashSalt: ''
      }
    }, { new: true });

    return updatedUser || { email, verified: true };
  }
  throw new Error('Either phone or email is required for verify OTP and otp is required to verify');
}



////// upload profile pic in s3 bucket //////
exports.uploadProfilePic = async (file, reqUser) => {
  const user = await UserModel.findById(reqUser._id);
  if (!user) throw new Error('User not found');
  if (!file) throw new Error('Profile picture is required');

  // Upload to S3 (accepts either multer file object or base64 string)
  const profilePicUrl = await uploadFileToS3(file, 'profile-pics');

  await UserModel.findByIdAndUpdate(user._id, {
    $set: { profilePic: profilePicUrl }
  });

  return { profilePic: profilePicUrl, user: user };
}

////// update user profile //////
exports.updateProfile = async (reqBody, reqUser) => {
  const { name, email, phone, bio, skills, github, linkedin,
     portfolio, college, course, semester, technologies, TutorSpecificFields , password } = reqBody;
  const user = await UserModel.findById(reqUser._id);
  if (!user) throw new Error('User not found');

  const updateData = {};

  // Check if email is being changed
  if (email !== undefined && email !== '' && email !== user.email) {
    // Check if email already exists for another user
    const existingEmailUser = await UserModel.findOne({
      email: email,
      _id: { $ne: user._id } // Exclude current user
    });
    if (existingEmailUser) {
      throw new Error('Email already exists for another user');
    }
    updateData.email = email;
    updateData.isEmailVerified = false; // Reset verification for new email
  } else if (email === user.email) {
    // Same email, no change needed
  } else if (email !== undefined) {
    updateData.email = email;
  }

  // Check if phone is being changed
  if (phone !== undefined && phone !== '' && phone !== user.phone) {
    // Check if phone already exists for another user
    const existingPhoneUser = await UserModel.findOne({
      phone: phone,
      _id: { $ne: user._id } // Exclude current user
    });
    if (existingPhoneUser) {
      throw new Error('Phone number already exists for another user');
    }
    updateData.phone = phone;
    updateData.TutorSpecificFields = TutorSpecificFields;
    updateData.hashedPassword = password ? await bcrypt.hash(password, await bcrypt.genSalt(10)) : user.hashedPassword;
    updateData.isMobileVerified = false; // Reset verification for new phone
  } else if (phone === user.phone) {
    // Same phone, no change needed
  } else if (phone !== undefined) {
    updateData.phone = phone;
  }

  // Other fields
  if (name !== undefined) updateData.name = name;
  if (bio !== undefined) updateData.bio = bio;
  if (skills !== undefined) updateData.skills = Array.isArray(skills) ? skills : skills;
  if (github !== undefined) updateData.github = github;
  if (linkedin !== undefined) updateData.linkedin = linkedin;
  if (portfolio !== undefined) updateData.portfolio = portfolio;
  if (college !== undefined) updateData.college = college;
  if (course !== undefined) updateData.course = course;
  if (semester !== undefined) updateData.semester = semester;
  if (technologies !== undefined) updateData.technologies = Array.isArray(technologies) ? technologies : technologies;

  // Update user with new data
  const updatedUser = await UserModel.findByIdAndUpdate(
    user._id,
    { $set: updateData },
    { new: true } // Return updated document
  );

  return updatedUser;
}


exports.createAdmin = async (reqBody, reqUser) => {
  try {
    const { name, email, phone, password, role, isActive } = reqBody;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // check if phone or email already exits 
    const existingUser = await UserModel.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      throw new Error('Phone or email already exists');
    }
    // check if role is valid
    if (!['Super Admin', 'Support Admin', 'Admin', 'Tutor', 'Employee',
      'HR', 'Finance', 'Project Manager', 'Sales'].includes(role)) {
      throw new Error('Invalid role');
    }
    const user = await UserModel.create({ name, email, phone, hashedPassword, role, isActive });
    return user;
  } catch (error) {
    return Promise.reject(error);
  }


}

exports.loginEmailPassword = async (reqBody) => {
  try {
    const { email, password } = reqBody;
    const user = await UserModel.findOne({
      email: email, isActive: true,
      role: {
        $in: ['Super Admin', 'Support Admin', 'Admin', 'Tutor', 'Employee',
          'HR', 'Finance', 'Project Manager', 'Sales']
      }
    });
    if (!user) throw new Error('User not found');
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) throw new Error('Invalid password');
    // generate token
    const { token, refreshToken } = await authService.generateToken(user);
    return {
       user: user,
       token: token.token,
       refreshToken: refreshToken.token
     }
  } catch (error) {
    return Promise.reject(error);
  }
}

exports.getRoleWiseUserList = async (role = '', reqUser) => {
  try {
    let query = { isActive: true };
    if (reqUser.role == 'Super Admin' || reqUser.role == 'Support Admin') {
      query.role = role?role:reqUser.role;
    }else{
      query._id = reqUser._id || null;
    }
    const users = await UserModel.find(query).select('name email phone role isActive createdAt updatedAt');
    return users;
  } catch (error) {
    return Promise.reject(error);
  }
}

exports.getUserDetails = async (id, reqUser) => {
  try {
    const user = await UserModel.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  } catch (error) {
    return Promise.reject(error);
  }
}

exports.updateUserDetails = async (id, reqBody, reqUser) => {   
  console.log('reqBody',reqBody);
  try {
    if(reqBody.password){
      reqBody.hashedPassword = await bcrypt.hash(reqBody.password, await bcrypt.genSalt(10));
    }
    /// remove reqBody.password from reqBody 
    delete reqBody.password;
    const user = await UserModel.findByIdAndUpdate(id, {$set: reqBody}, { new: true });
    if (!user) throw new Error('User not found');
    return user;
  } catch (error) {
    return Promise.reject(error);
  }
}

exports.listOfAdminSupportAdminSuperAdminAffiliate = async (reqUser) => {
  try {
    const users = await UserModel.find({ role: { $in: ['Affiliate', 'Support Admin','Admin','Super Admin'] }, isActive: true });
    return {
      users: users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        companyName: user.companyName,
        commissionPercentage: user.commissionPercentage,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    };
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getAffiliateListWithStats = async (query, reqUser) => {
  try {
    const { page = 1, limit = 10, status, search } = query;

    // Build query for affiliates
    const affiliateQuery = { role: 'Affiliate' };
    
    if (status) {
      if (status === 'active') {
        affiliateQuery.isActive = true;
      } else if (status === 'inactive') {
        affiliateQuery.isActive = false;
      }
    }

    if (search) {
      affiliateQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Get affiliates with pagination
    const [affiliates, total] = await Promise.all([
      UserModel.find(affiliateQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      UserModel.countDocuments(affiliateQuery),
    ]);

    // Get sales stats for each affiliate using aggregation
    const affiliateIds = affiliates.map(aff => aff._id);

    const salesStats = await TapTagSale.aggregate([
      {
        $match: {
          SalesPerson: { $in: affiliateIds },
        },
      },
      {
        $group: {
          _id: '$SalesPerson',
          cardsActivated: { $sum: 1 },
          totalSalesAmount: { $sum: '$totalSaleAmount' },
          totalCommissionEarned: { $sum: '$commisionAmountOfSalesPerson' },
          totalCost: { $sum: '$castAmountOfProductAndServices' },
          totalOwnerCommission: { $sum: '$commisionAmountOfOwner' },
        },
      },
    ]);

    // Create a map of affiliateId -> stats
    const statsMap = {};
    salesStats.forEach(stat => {
      statsMap[stat._id.toString()] = {
        cardsActivated: stat.cardsActivated || 0,
        totalSalesAmount: stat.totalSalesAmount || 0,
        totalCommissionEarned: stat.totalCommissionEarned || 0,
        totalCost: stat.totalCost || 0,
        totalOwnerCommission: stat.totalOwnerCommission || 0,
      };
    });

    // Combine affiliate data with stats
    const affiliatesWithStats = affiliates.map(affiliate => {
      const stats = statsMap[affiliate._id.toString()] || {
        cardsActivated: 0,
        totalSalesAmount: 0,
        totalCommissionEarned: 0,
        totalCost: 0,
        totalOwnerCommission: 0,
      };

      return {
        _id: affiliate._id,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        status: affiliate.isActive ? 'ACTIVE' : 'INACTIVE',
        address: affiliate.address,
        city: affiliate.city,
        state: affiliate.state,
        pincode: affiliate.pincode,
        companyName: affiliate.companyName,
        commissionPercentage: affiliate.commissionPercentage || 0,
        isActive: affiliate.isActive,
        // Sales Stats
        cardsActivated: stats.cardsActivated,
        totalSalesAmount: stats.totalSalesAmount,
        totalCommissionEarned: stats.totalCommissionEarned,
        totalCost: stats.totalCost,
        totalOwnerCommission: stats.totalOwnerCommission,
        createdAt: affiliate.createdAt,
        updatedAt: affiliate.updatedAt,
      };
    });

    return {
      items: affiliatesWithStats,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    return Promise.reject(error);
  }
};


exports.createAffiliateUser = async (reqBody, reqUser) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      password, 
      role, 
      address,
      city,
      state,
      pincode,
      companyName,
      commissionPercentage = 0,
      isActive = true 
    } = reqBody;

    // Check if phone or email already exists
    const existingUser = await UserModel.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      throw new Error('Phone or email already exists');
    }

    // Validate role
    if (role !== 'Affiliate') {
      throw new Error('Role must be Affiliate');
    }

    // Validate commission percentage
    if (commissionPercentage < 0 || commissionPercentage > 100) {
      throw new Error('Commission percentage must be between 0 and 100');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create affiliate user
    const user = await UserModel.create({ 
      name, 
      email, 
      phone, 
      hashedPassword, 
      role: 'Affiliate', 
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      companyName: companyName || '',
      commissionPercentage: commissionPercentage || 0,
      isActive,
      createdBy: reqUser?._id || null,
    });

    // Return user without password
    const userObj = user.toObject();
    delete userObj.hashedPassword;
    return userObj;
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.updateAffiliateUser = async (id, reqBody, reqUser) => {
  try {
    // Check if user exists and is an Affiliate
    const user = await UserModel.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role !== 'Affiliate') {
      throw new Error('User is not an Affiliate');
    }

    const { 
      name, 
      email, 
      phone, 
      password, 
      address,
      city,
      state,
      pincode,
      companyName,
      commissionPercentage,
      isActive 
    } = reqBody;
    const updateData = {};

    // Check if email is being changed
    if (email !== undefined && email !== '' && email !== user.email) {
      const existingEmailUser = await UserModel.findOne({
        email: email,
        _id: { $ne: user._id }
      });
      if (existingEmailUser) {
        throw new Error('Email already exists for another user');
      }
      updateData.email = email;
      updateData.isEmailVerified = false;
    }

    // Check if phone is being changed
    if (phone !== undefined && phone !== '' && phone !== user.phone) {
      const existingPhoneUser = await UserModel.findOne({
        phone: phone,
        _id: { $ne: user._id }
      });
      if (existingPhoneUser) {
        throw new Error('Phone number already exists for another user');
      }
      updateData.phone = phone;
      updateData.isMobileVerified = false;
    }

    // Update basic fields
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update affiliate specific fields
    if (address !== undefined) updateData.address = address || '';
    if (city !== undefined) updateData.city = city || '';
    if (state !== undefined) updateData.state = state || '';
    if (pincode !== undefined) updateData.pincode = pincode || '';
    if (companyName !== undefined) updateData.companyName = companyName || '';
    
    // Validate and update commission percentage
    if (commissionPercentage !== undefined) {
      if (commissionPercentage < 0 || commissionPercentage > 100) {
        throw new Error('Commission percentage must be between 0 and 100');
      }
      updateData.commissionPercentage = commissionPercentage;
    }

    // Update password if provided
    if (password !== undefined && password !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.hashedPassword = await bcrypt.hash(password, salt);
    }

    // Add updatedBy
    updateData.updatedBy = reqUser?._id || null;

    // Update user
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('Failed to update affiliate user');
    }

    // Return user without password
    const userObj = updatedUser.toObject();
    delete userObj.hashedPassword;
    return userObj;
  } catch (error) {
    return Promise.reject(error);
  }
};


exports.tagAssignToAffiliate = async (id, query = {}, reqUser) => {
  try {
    const user = await UserModel.findById(id);
    if (!user) throw new Error('User not found');

    const {
      page = 1,
      limit = 10,
      status,
      search,
    } = query;

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = { assignedTo: user._id };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { tagId: regex },
        { shortCode: regex },
      ];
    }

    const [items, total] = await Promise.all([
      TapTag.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('ownerAssignedTo', 'fullName phone city vehicle'),
      TapTag.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit) || 0,
      limit: parsedLimit,
    };
  } catch (error) {
    return Promise.reject(error);
  }
};