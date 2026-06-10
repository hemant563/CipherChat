import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_STATUS } from '../utils/constants.js';

const { Schema, model } = mongoose;

/**
 * User Schema
 * Handles authentication, profile, E2EE keys, privacy settings, and contacts.
 */
const userSchema = new Schema(
  {
    // ── Authentication ────────────────────────────────────────
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password by default
    },

    // ── Profile ───────────────────────────────────────────────
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.OFFLINE,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // ── End-to-End Encryption ─────────────────────────────────
    publicKey: {
      type: String,
      default: '', // RSA-4096 public key (PEM format), generated client-side
    },

    // ── Verification & Roles ──────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    
    // ── Premium Membership ────────────────────────────────────
    isPremium: {
      type: Boolean,
      default: false,
    },
    premiumPlan: {
      type: String,
      enum: ['none', 'monthly', 'yearly'],
      default: 'none',
    },
    premiumStartDate: {
      type: Date,
      default: null,
    },
    premiumEndDate: {
      type: Date,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'none'],
      default: 'none',
    },
    paymentId: {
      type: String,
    },
    orderId: {
      type: String,
    },

    // ── OTP (stored temporarily for phone verification) ───────
    otp: {
      code: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      attempts: { type: Number, default: 0, select: false },
    },

    // ── Trusted Devices ───────────────────────────────────────
    trustedDevices: [
      {
        deviceId: String,
        deviceName: String,
        lastActive: { type: Date, default: Date.now },
        userAgent: String,
      },
    ],

    // ── Privacy & Notification Settings ───────────────────────
    settings: {
      privacy: {
        showLastSeen: { type: Boolean, default: true },
        showProfilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
        showStatus: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
        readReceipts: { type: Boolean, default: true },
        accountPrivate: { type: Boolean, default: false },
        hideActiveStatus: { type: Boolean, default: false },
      },
      notifications: {
        messages: { type: Boolean, default: true },
        groups: { type: Boolean, default: true },
        calls: { type: Boolean, default: true },
        sound: { type: Boolean, default: true },
        vibrate: { type: Boolean, default: true },
        hapticFeedback: { type: Boolean, default: true },
        desktopAlerts: { type: Boolean, default: true },
        messageTone: { type: String, default: 'Default (Pop)' }
      },
      security: {
        twoStepVerification: { type: Boolean, default: false },
        chatLockPin: { type: String, select: false } // Hashed PIN for locked chats
      },
      ai: {
        smartReplies: { type: Boolean, default: true }
      }
    },

    // ── Relationships ─────────────────────────────────────────
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    contacts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    pendingRequests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lockedChats: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],

    // ── Refresh Token (for JWT rotation) ──────────────────────
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.otp;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────
userSchema.index({ username: 'text', displayName: 'text' });

// ── Pre-save: Hash password ───────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ── Instance Methods ──────────────────────────────────────────

/**
 * Compare a candidate password with the hashed password.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if this user has blocked a given user.
 * @param {string} userId
 * @returns {boolean}
 */
userSchema.methods.hasBlocked = function (userId) {
  return this.blockedUsers.some((id) => id.toString() === userId.toString());
};

const User = model('User', userSchema);

export default User;
