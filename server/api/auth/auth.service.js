//const crypto = require('crypto');
// In-memory OTP store for demo; replace with DB or Redis in production

const UserModel = require('../user/user.model.js');
const {verifyGoogleLogin}  = require('../../utility/verifyGoogleLogin.js');
const verificationTokensService = require("../verificationTokens/verificationTokens.service.js");

const { generateOTP, getHashedOtp, generateSalt } = require('../../utility/util.js');
const jwtHelper = require('../../helpers/jwt.helper.js');
const userService = require('../user/user.service.js');

exports.sendOtpPhone = async ({ phone }) => {
    // Ensure a user record exists for this phone
    let user = await UserModel.findOne({ phone });
    if (!user) {
        user = await UserModel.create({ phone });
    }

    const otp = generateOtp(6);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore.set(phone, { otp, expiresAt });

    // TODO: integrate SMS provider here
    return { phone, otpSent: true, otp };
};

exports.verifyOtp = async ({ phone, email, otp }) => {
    if (phone) {
        
    }
    if (email) {
        const user = await UserModel.findOne({ email });
        if (!user) throw new Error('User not found');
        if (user.otp !== otp) throw new Error('Invalid OTP');
        return { email, verified: true };
    }
    throw new Error('Either phone or email is required for verify OTP and otp is required to verify');
}

exports.signIn = async ({
  email,
  phone,
  googleToken,
  deviceToken,
  deviceInfo
}) => {
  if (email) {
    // Validate presence of googleToken
    if (!googleToken) {
      throw new Error('Google token is required for email sign-in');
    }

    // Verify the google token and email
    // const isGoogleValid = await verifyGoogleLogin(googleToken);
    // if (!isGoogleValid) {
    //   throw new Error('Invalid email or googleToken');
    // }

    // Find or create user
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({ email, googleToken, deviceToken, deviceInfo, isEmailVerified: true });
      if (!user) {
        throw new Error('Failed to create new user');
      }
    }

    // Check existing login
    let isUserAlreadyLoggedIn = await verificationTokensService.checkUserLoggedIn(user._id);
  
    if (isUserAlreadyLoggedIn) {
      // if already logged in remove all tokens
      await verificationTokensService.revokeAllTokenForUser(user._id);
    }

    // Generate new tokens
    let { token, refreshToken } = await generateToken({
      _id: user._id,
      role: user.role,
    });

    // Update last login
    await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        lastLogin: new Date(),
        // loginAttempts: 0
      }
    });
    return {
       user: {
          _id: user._id,
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          role: user.role,
          isEmailVerified: user?.isEmailVerified || false,
          isMobileVerified: user?.isMobileVerified || false,
          bio: user?.bio || '',
          profilePic:user?.profilePic || '',
        },
        // androidVersion : "v1.0.1",
        // iosversion : "v1.0.1",
        token: token.token,
        refreshToken: refreshToken.token
      }
  }

  if (phone) {
    // Find or create user for phone authentication
    let user = await UserModel.findOne({ phone });
    if (!user) {
      user = await UserModel.create({ phone });
    }
    const otp = generateOTP(6);
    const expiresAt = Date.now() + 1 * 60 * 1000; // 1 minutes expiry
    const salt = generateSalt();
    const hashedOtp = getHashedOtp(otp, salt);
    await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        otp: hashedOtp,
        hashSalt: salt,
        otpExpiry: expiresAt,
        isMobileVerified: false  // varify api will be called to verify the otp
      }
    });
// Check existing login
let isUserAlreadyLoggedIn = await verificationTokensService.checkUserLoggedIn(user._id);
  
if (isUserAlreadyLoggedIn) {
  // if already logged in remove all tokens
  await verificationTokensService.revokeAllTokenForUser(user._id);
}

// Generate new tokens
let { token, refreshToken } = await generateToken({
  _id: user._id,
  role: user.role,
});

    return {
      user: {
         _id: user._id,
         name: user?.name || '',
         email: user?.email || '',
         phone: user?.phone || '',
         role: user.role,
         isEmailVerified: user?.isEmailVerified || false,
         isMobileVerified: user?.isMobileVerified || false,
         bio: user?.bio || '',
         profilePic:user?.profilePic || '', // TODO: add profile picture url
         otp: otp,
         otpExpiry: expiresAt,
         hashSalt: salt,
       },
       token: token.token,
       refreshToken: refreshToken.token
  }

 
};

throw new Error('Either email or phone is required for sign in');

};

async function generateToken(user) {
  try {
      let token = await verificationTokensService.registerToken({
          data: {
              _id: user._id,
              role: user.role,
          },
          secret: process.env.SESSION_SECRET,
          type: 'auth'
      }, user)
    
      let refreshToken = await verificationTokensService.registerToken({
          data: {
              _id: user._id,
              role: user.role,
          },
          secret: process.env.REFRESH_SECRET,
          type: 'refresh',
          expiresIn: {
              expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
          }
      }, user)

      return { token, refreshToken }
  } catch (error) {
      return Promise.reject(error)
  }
}
exports.generateToken = generateToken


exports.refresh = async (body, refreshToken) => {
  try {
      let tokenObj = await verificationTokensService.checkRefreshToken(refreshToken)

      if (!tokenObj) throw 'Invalid Token!'
      
      let userObj = await userService.findOne({
          _id: tokenObj.user
      }).select("_id role")

      if (!userObj) throw 'Invalid User!'

      // revoke all tokens for the user
      await verificationTokensService.revokeAllTokenForUser(userObj._id)

      let { token, refreshToken: newRefreshToken } = await generateToken(userObj)

      return {
          user: {
              email: userObj.email,
              role: userObj.role,
          },
          token: token.token,
          refreshToken: newRefreshToken.token
      }

  } catch (error) {
      return Promise.reject(error)
  }
}

exports.isAuthenticated = ({ skipAuth, role = null, logout }) => {
  return async (req, res, next) => {
    try {
        let token = req.headers.authorization
       
        if (skipAuth && !token) {
            return next();
        }

        if (logout) {
           await jwtHelper.logout(token);
        }
       
        if (!token) throw "Authentication token not found!"
        let tokenData = await jwtHelper.verify(token, process.env.SESSION_SECRET);
        let userQuery = {
            _id: tokenData._id
        }
        let userObj = await userService.findOne(userQuery);
        if (!userObj) throw "Unauthorized!"
        
        // Check role if provided
        if (role && Array.isArray(role)) {
            if (!role.includes(userObj.role)) {
                throw "Your are not authorized to access this resource!";
            }
        }
        
        req.user = userObj;
        return next();
    } catch (error) {
        return responseHandler.error(res, error, error.message || error, 401);
    }
  };
};
