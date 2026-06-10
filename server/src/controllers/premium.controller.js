import { User } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getPremiumStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('isPremium premiumPlan premiumStartDate premiumEndDate paymentStatus');
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Check auto-expiration
  let expired = false;
  if (user.isPremium && user.premiumEndDate && Date.now() > new Date(user.premiumEndDate).getTime()) {
    user.isPremium = false;
    user.premiumPlan = 'none';
    user.paymentStatus = 'none';
    await user.save({ validateBeforeSave: false });
    expired = true;
  }

  res.status(200).json(ApiResponse.ok({
    status: user,
    expiredJustNow: expired
  }));
});

export const purchasePremium = asyncHandler(async (req, res) => {
  const { plan, paymentDetails } = req.body; // plan: 'monthly' or 'yearly'

  if (!['monthly', 'yearly'].includes(plan)) {
    throw ApiError.badRequest('Invalid plan selected');
  }

  // Mock Payment Validation
  if (!paymentDetails || !paymentDetails.cardNumber || paymentDetails.cardNumber.length < 10) {
    throw ApiError.badRequest('Invalid payment details');
  }

  const user = await User.findById(req.user._id);

  // Activate premium
  user.isPremium = true;
  user.premiumPlan = plan;
  user.premiumStartDate = new Date();
  
  const endDate = new Date();
  if (plan === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  user.premiumEndDate = endDate;
  user.paymentStatus = 'completed';

  await user.save({ validateBeforeSave: false });

  res.status(200).json(ApiResponse.ok({
    user: {
      isPremium: user.isPremium,
      premiumPlan: user.premiumPlan,
      premiumEndDate: user.premiumEndDate
    }
  }, 'Premium membership activated successfully!'));
});
