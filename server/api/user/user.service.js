const UserModel = require('./user.model');
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
