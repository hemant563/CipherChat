import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Payment, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';

// Initialize Razorpay instance lazily to avoid crashing if keys are missing on startup
let razorpayInstance = null;
const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_SECRET) {
      throw ApiError.internal('Razorpay keys are not configured in the environment variables');
    }
    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_SECRET,
    });
  }
  return razorpayInstance;
};

/**
 * @desc    Create Razorpay order
 * @route   POST /api/v1/payment/create-order
 * @access  Private
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { plan } = req.body;

  if (!plan || !['monthly', 'yearly'].includes(plan)) {
    throw ApiError.badRequest('Invalid or missing plan');
  }

  const amount = plan === 'yearly' ? 479900 : 49900; // Amount in paise (₹4799 or ₹499)
  const currency = 'INR';

  const rzp = getRazorpayInstance();

  const options = {
    amount,
    currency,
    receipt: `rcpt_${req.user._id.toString().slice(-6)}_${Date.now()}`,
    payment_capture: 1, // Auto capture
  };

  const order = await rzp.orders.create(options);

  if (!order) {
    throw ApiError.internal('Failed to create Razorpay order');
  }

  // Record the order in DB
  const payment = await Payment.create({
    userId: req.user._id,
    amount: amount / 100, // store in rupees
    currency,
    plan,
    razorpayOrderId: order.id,
    status: 'created',
  });

  res.status(201).json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentRecordId: payment._id,
      keyId: env.RAZORPAY_KEY_ID // required by frontend
    },
  });
});

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/v1/payment/verify
 * @access  Private
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw ApiError.badRequest('Missing payment verification details');
  }

  if (!env.RAZORPAY_SECRET) {
    throw ApiError.internal('Razorpay secret is missing');
  }

  // Generate signature using HMAC SHA256
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  if (!isAuthentic) {
    // If not authentic, update payment record to failed if found
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'failed', razorpayPaymentId: razorpay_payment_id }
    );
    throw ApiError.badRequest('Invalid payment signature');
  }

  // Update payment record to success
  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id },
    {
      status: 'success',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    },
    { new: true }
  );

  if (!payment) {
    throw ApiError.notFound('Payment record not found');
  }

  // Calculate premium expiry date
  const now = new Date();
  let premiumEndDate = new Date(now);
  if (payment.plan === 'yearly') {
    premiumEndDate.setFullYear(now.getFullYear() + 1);
  } else {
    premiumEndDate.setMonth(now.getMonth() + 1);
  }

  // Update user with premium status
  await User.findByIdAndUpdate(req.user._id, {
    isPremium: true,
    premiumPlan: payment.plan,
    premiumStartDate: now,
    premiumEndDate: premiumEndDate,
    paymentStatus: 'completed',
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
  });

  res.status(200).json({
    success: true,
    message: 'Payment verified and premium activated successfully',
    data: {
      isPremium: true,
      premiumPlan: payment.plan,
      premiumEndDate,
    },
  });
});

/**
 * @desc    Get payment history
 * @route   GET /api/v1/payment/history
 * @access  Private
 */
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      payments,
    },
  });
});

/**
 * @desc    Mark payment as failed
 * @route   POST /api/v1/payment/fail
 * @access  Private
 */
export const markPaymentFailed = asyncHandler(async (req, res) => {
  const { razorpay_order_id } = req.body;
  
  if (!razorpay_order_id) {
    throw ApiError.badRequest('Missing order ID');
  }

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id, userId: req.user._id },
    { status: 'failed' },
    { new: true }
  );

  res.status(200).json(ApiResponse.ok(payment, 'Payment marked as failed'));
});

/**
 * @desc    Insecure bypass checkout for local testing
 * @route   POST /api/v1/payment/insecure-checkout
 * @access  Private
 */
export const insecureCheckout = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!plan || !['monthly', 'yearly'].includes(plan)) {
    throw ApiError.badRequest('Invalid or missing plan');
  }

  const now = new Date();
  let premiumEndDate = new Date(now);
  if (plan === 'yearly') {
    premiumEndDate.setFullYear(now.getFullYear() + 1);
  } else {
    premiumEndDate.setMonth(now.getMonth() + 1);
  }

  await User.findByIdAndUpdate(req.user._id, {
    isPremium: true,
    premiumPlan: plan,
    premiumStartDate: now,
    premiumEndDate: premiumEndDate,
    paymentStatus: 'completed',
    paymentId: 'insecure_dummy_payment_id',
    orderId: 'insecure_dummy_order_id',
  });

  res.status(200).json({
    success: true,
    message: 'Premium activated securely (Bypass)',
    data: {
      isPremium: true,
      premiumPlan: plan,
      premiumEndDate,
    },
  });
});
