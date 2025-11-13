


const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Utility function to verify Google login
const verifyGoogleLogin = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, email_verified, name, sub: googleId, hd } = payload;


    return { email, name,email_verified, sub: googleId };
  } catch (error) {
    console.error('Google login error:', error.message);
    throw new Error('Invalid Google token');
  }
};








module.exports = { verifyGoogleLogin };
