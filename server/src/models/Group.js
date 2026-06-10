import mongoose from 'mongoose';
import { GROUP_TYPE, GROUP_ROLE } from '../utils/constants.js';
import crypto from 'crypto';

const { Schema, model } = mongoose;

/**
 * Group Schema
 * Supports groups, communities, and channels with role-based membership.
 */
const groupSchema = new Schema(
  {
    // ── Basic Info ─────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: Object.values(GROUP_TYPE),
      default: GROUP_TYPE.GROUP,
    },

    // ── Ownership & Membership ────────────────────────────────
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: Object.values(GROUP_ROLE),
          default: GROUP_ROLE.MEMBER,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        isMuted: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ── Settings ──────────────────────────────────────────────
    settings: {
      category: {
        type: String,
        enum: ['Tech', 'Design', 'Gaming', 'Music', 'Science', 'Fitness', 'Official'],
        default: 'Tech',
      },
      onlyAdminsCanMessage: {
        type: Boolean,
        default: false,
      },
      approvalRequired: {
        type: Boolean,
        default: false,
      },
      maxMembers: {
        type: Number,
        default: 256,
      },
      disappearingMessages: {
        enabled: { type: Boolean, default: false },
        duration: { type: Number, default: 86400 }, // seconds (24h default)
      },
    },

    // ── Invite Link ───────────────────────────────────────────
    inviteLink: {
      type: String,
      unique: true,
      sparse: true,
    },
    inviteLinkEnabled: {
      type: Boolean,
      default: true,
    },

    // ── Pending Join Requests (when approvalRequired=true) ────
    pendingRequests: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        requestedAt: { type: Date, default: Date.now },
      },
    ],

    // ── State ─────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ creator: 1 });
groupSchema.index({ name: 'text', description: 'text' });

// ── Virtuals ──────────────────────────────────────────────────
groupSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.length : 0;
});

// ── Pre-save: Generate invite link ────────────────────────────
groupSchema.pre('save', function (next) {
  if (this.isNew && !this.inviteLink) {
    this.inviteLink = crypto.randomBytes(16).toString('hex');
  }
  next();
});

// ── Instance Methods ──────────────────────────────────────────

/**
 * Check if a user is a member of this group.
 * @param {string} userId
 * @returns {boolean}
 */
groupSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

/**
 * Check if a user is an admin of this group.
 * @param {string} userId
 * @returns {boolean}
 */
groupSchema.methods.isAdmin = function (userId) {
  return (
    this.admins.some((id) => id.toString() === userId.toString()) ||
    this.creator.toString() === userId.toString()
  );
};

/**
 * Get a member's role.
 * @param {string} userId
 * @returns {string|null}
 */
groupSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

const Group = model('Group', groupSchema);

export default Group;
