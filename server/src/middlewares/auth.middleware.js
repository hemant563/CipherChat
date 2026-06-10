import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';

/**
 * Middleware to verify JWT token and attach user to req object.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw ApiError.unauthorized('Not authorized to access this route');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select('+isAdmin +isVerified');

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists');
    }

    // Auto-expire premium membership
    if (user.isPremium && user.premiumEndDate && Date.now() > new Date(user.premiumEndDate).getTime()) {
      user.isPremium = false;
      user.premiumPlan = 'none';
      user.paymentStatus = 'none';
      await user.save({ validateBeforeSave: false });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired');
    }
    throw ApiError.unauthorized('Not authorized');
  }
});

/**
 * Middleware to require admin privileges.
 */
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    throw ApiError.forbidden('Not authorized as an admin');
  }
};
