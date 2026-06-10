import crypto from 'crypto';
import { User } from '../models/index.js';
import OtpService from '../services/otp.service.js';
import TokenService from '../services/token.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import env from '../config/env.js';

// Setup cookie options for refresh token
const cookieOptions = {
  httpOnly: true,
  secure: env.IS_PRODUCTION,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const sendOtp = asyncHandler(async (req, res) => {
  const { email, username } = req.body;

  const otp = OtpService.generateOtp();
  const hashedOtp = await OtpService.hashOtp(otp);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  let user;
  if (username) {
    user = await User.findOne({ username: username.toLowerCase().trim() }).select('+otp.code +otp.expiresAt +otp.attempts');
  }

  if (!user) {
    // Find or create temp user for registration to store OTP without overwriting existing accounts
    user = await User.findOne({ email, password: { $exists: false } }).select('+otp.code +otp.expiresAt +otp.attempts');
    if (!user) {
      if (!email) {
        throw ApiError.badRequest('Account not found. Please provide a valid username.');
      }
      user = new User({ 
        email, 
        username: `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}` 
      });
    }
  }

  user.otp = { code: hashedOtp, expiresAt, attempts: 0 };
  await user.save({ validateBeforeSave: false });

  // Use the user's email if it exists (crucial for 2FA login and forgot password using username)
  const targetEmail = user.email || email;

  // Send email in the background so we don't block the UI response
  OtpService.sendEmailOtp(targetEmail, otp).catch(err => {
    // Log the error but don't crash, the user can always hit 'Resend'
    console.error('Failed to send OTP in background:', err);
  });

  const responseData = { mockOtp: otp };
  res.status(200).json(ApiResponse.ok(responseData, 'OTP sent successfully'));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { username, otp, newPassword } = req.body;

  const user = await User.findOne({ username: username.toLowerCase().trim() }).select('+otp.code +otp.expiresAt +otp.attempts +password');

  if (!user || !user.otp || !user.otp.code) {
    throw ApiError.badRequest('No OTP requested for this account');
  }

  if (new Date() > user.otp.expiresAt) {
    throw ApiError.badRequest('OTP expired');
  }

  if (user.otp.attempts >= 3) {
    throw ApiError.badRequest('Too many failed attempts. Please request a new OTP.');
  }

  const isMatch = await OtpService.verifyOtp(otp, user.otp.code);
  if (!isMatch) {
    user.otp.attempts += 1;
    await user.save({ validateBeforeSave: false });
    throw ApiError.badRequest('Invalid OTP');
  }

  // Clear OTP
  user.otp = undefined;
  
  // Set new password (the User model pre-save hook handles hashing automatically)
  user.password = newPassword;
  
  await user.save({ validateBeforeSave: false });

  res.status(200).json(ApiResponse.ok(null, 'Password reset successfully'));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, username } = req.body;

  let user;
  if (username) {
    user = await User.findOne({ username: username.toLowerCase().trim() }).select('+otp.code +otp.expiresAt +otp.attempts +password');
  } else {
    // Find temp user by email for registration
    user = await User.findOne({ email, password: { $exists: false }, 'otp.code': { $exists: true } }).select('+otp.code +otp.expiresAt +otp.attempts +password');
  }

  if (!user || !user.otp || !user.otp.code) {
    throw ApiError.badRequest('No OTP requested for this account');
  }

  if (new Date() > user.otp.expiresAt) {
    throw ApiError.badRequest('OTP expired');
  }

  if (user.otp.attempts >= 3) {
    throw ApiError.badRequest('Too many failed attempts. Please request a new OTP.');
  }

  const isMatch = await OtpService.verifyOtp(otp, user.otp.code);
  if (!isMatch) {
    user.otp.attempts += 1;
    await user.save({ validateBeforeSave: false });
    throw ApiError.badRequest('Invalid OTP');
  }

  // Clear OTP
  user.otp = undefined;
  await user.save({ validateBeforeSave: false });

  // If user is already registered (has username/password), just log them in
  if (user.username && user.password && !user.username.startsWith('temp_')) {
    const { accessToken, refreshToken } = TokenService.generateAuthTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .cookie('accessToken', accessToken, cookieOptions)
      .json(ApiResponse.ok({ user, accessToken, refreshToken, isRegistered: true }, 'Login successful'));
  }

  // Otherwise, issue a temporary token to proceed to registration step
  const tempToken = crypto.randomBytes(32).toString('hex');
  user.otp = { code: await OtpService.hashOtp(tempToken), expiresAt: new Date(Date.now() + 15 * 60 * 1000) };
  await user.save({ validateBeforeSave: false });

  res.status(200).json(ApiResponse.ok({ otpToken: tempToken, isRegistered: false }, 'OTP verified'));
});

export const register = asyncHandler(async (req, res) => {
  const { email, otpToken, username, password, displayName, publicKey } = req.body;

  const user = await User.findOne({ email, password: { $exists: false } }).select('+otp.code +otp.expiresAt +otp.attempts +password');
  if (!user || !user.otp || !user.otp.code) {
    throw ApiError.badRequest('Registration session expired');
  }

  if (user.password && !user.username.startsWith('temp_')) {
    throw ApiError.badRequest('User is already registered. Please log in.');
  }

  const isMatch = await OtpService.verifyOtp(otpToken, user.otp.code);
  if (!isMatch || new Date() > user.otp.expiresAt) {
    throw ApiError.badRequest('Invalid or expired registration session');
  }

  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    throw ApiError.conflict('Username is already taken');
  }

  user.username = username;
  user.password = password;
  user.displayName = displayName || username;
  user.publicKey = publicKey || '';
  user.isVerified = true;
  user.otp = undefined;

  const { accessToken, refreshToken } = TokenService.generateAuthTokens(user._id);
  user.refreshToken = refreshToken;
  
  await user.save();

  res
    .status(201)
    .cookie('accessToken', accessToken, cookieOptions)
    .json(ApiResponse.created({ user, accessToken, refreshToken }, 'User registered successfully'));
});

export const login = asyncHandler(async (req, res) => {
  const { username, password, deviceId, deviceName } = req.body;
  const cleanUsername = username?.toLowerCase().trim();

  let user = await User.findOne({ username: cleanUsername }).select('+password +refreshToken');
  if (!user) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  let isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  if (user.settings?.security?.twoStepVerification) {
    const otp = OtpService.generateOtp();
    const hashedOtp = await OtpService.hashOtp(otp);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
    
    user.otp = { code: hashedOtp, expiresAt, attempts: 0 };
    await user.save({ validateBeforeSave: false });
    
    OtpService.sendEmailOtp(user.email, otp).catch(err => {
      console.error('Failed to send OTP in background:', err);
    });
    
    return res.status(200).json(ApiResponse.ok({ 
      requiresTwoStep: true, 
      email: user.email 
    }, 'OTP sent for two-step verification'));
  }

  const { accessToken, refreshToken } = TokenService.generateAuthTokens(user._id);
  user.refreshToken = refreshToken;

  if (deviceId) {
    const existingDeviceIndex = user.trustedDevices.findIndex(d => d.deviceId === deviceId);
    if (existingDeviceIndex !== -1) {
      user.trustedDevices[existingDeviceIndex].lastActive = Date.now();
    } else {
      user.trustedDevices.push({ deviceId, deviceName: deviceName || 'Unknown Device', userAgent: req.headers['user-agent'] });
    }
  }

  await user.save({ validateBeforeSave: false });

  const userObj = user.toJSON();

  res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .json(ApiResponse.ok({ user: userObj, accessToken, refreshToken }, 'Login successful'));
});

export const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+refreshToken');
  if (user) {
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
  }

  res
    .status(200)
    .clearCookie('accessToken')
    .json(ApiResponse.ok(null, 'Logged out successfully'));
});

export const refreshTokens = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.accessToken; // In our impl, we could store refresh in cookie too, but using body here as per PRD
  
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token required');
  }

  try {
    const decoded = TokenService.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const tokens = TokenService.generateAuthTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res
      .status(200)
      .cookie('accessToken', tokens.accessToken, cookieOptions)
      .json(ApiResponse.ok(tokens, 'Tokens refreshed successfully'));
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
});

export const checkUsernameAvailability = asyncHandler(async (req, res) => {
  const { username } = req.query;
  const cleanUsername = username.toLowerCase().trim();

  const existingUser = await User.findOne({ username: cleanUsername });

  if (existingUser) {
    res.status(200).json(ApiResponse.ok({ isAvailable: false }, 'Username is already taken'));
  } else {
    res.status(200).json(ApiResponse.ok({ isAvailable: true }, 'Username is available'));
  }
});
