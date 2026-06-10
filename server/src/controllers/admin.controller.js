import { User, Group, Message } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getStats = asyncHandler(async (req, res) => {
  const [userCount, groupCount, messageCount] = await Promise.all([
    User.countDocuments(),
    Group.countDocuments(),
    Message.countDocuments(),
  ]);

  res.status(200).json(ApiResponse.ok({
    stats: {
      totalUsers: userCount,
      totalGroups: groupCount,
      totalMessages: messageCount
    }
  }));
});

export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;

  const query = {};
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .select('-password -otp -refreshToken');

  const total = await User.countDocuments(query);

  res.status(200).json(ApiResponse.ok({
    users,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    }
  }));
});

export const toggleBanUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (user.isAdmin) {
    throw ApiError.forbidden('Cannot ban another admin');
  }

  // Assuming we add an `isBanned` field to the User model, 
  // but let's just toggle `isVerified` or a similar field for now to block access, 
  // or add a dynamic property if it's missing from the schema.
  
  if (user.status === 'banned') {
    user.status = 'offline';
  } else {
    user.status = 'banned';
    // Clear tokens
    user.refreshToken = undefined;
  }

  res.status(200).json(ApiResponse.ok({ user }, `User ${user.status === 'banned' ? 'banned' : 'unbanned'} successfully`));
});

export const togglePremiumUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { action, plan } = req.body; // action: 'grant' or 'revoke'

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (action === 'grant') {
    user.isPremium = true;
    user.premiumPlan = plan || 'monthly';
    user.premiumStartDate = new Date();
    
    const endDate = new Date();
    if (user.premiumPlan === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);
    
    user.premiumEndDate = endDate;
    user.paymentStatus = 'completed';
  } else {
    user.isPremium = false;
    user.premiumPlan = 'none';
    user.premiumEndDate = null;
    user.paymentStatus = 'none';
  }

  await user.save({ validateBeforeSave: false });
  res.status(200).json(ApiResponse.ok({ user }, `Premium access ${action}ed successfully`));
});
