import mongoose from 'mongoose';
import { NOTIFICATION_TYPE } from '../utils/constants.js';

const { Schema, model } = mongoose;

/**
 * Notification Schema
 * Stores in-app notifications with optional push delivery tracking.
 * Auto-deletes after 30 days via TTL index.
 */
const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    body: {
      type: String,
      default: '',
      maxlength: 500,
    },

    // ── Flexible payload for different notification types ─────
    data: {
      type: Schema.Types.Mixed,
      default: {},
      // Examples:
      // message notification: { messageId, senderId, conversationId }
      // call notification:    { callId, callerId, callType }
      // group invite:         { groupId, inviterId }
    },

    // ── Read tracking ─────────────────────────────────────────
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },

    // ── Push delivery tracking ────────────────────────────────
    isPushSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// ── TTL: Auto-delete after 30 days ────────────────────────────
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Notification = model('Notification', notificationSchema);

export default Notification;
