import mongoose from 'mongoose';
import { MESSAGE_TYPE } from '../utils/constants.js';

const { Schema, model } = mongoose;

/**
 * Message Schema
 * Stores encrypted messages for 1-to-1 and group conversations.
 * Content is stored as ciphertext — decryption happens client-side.
 */
const messageSchema = new Schema(
  {
    // ── Conversation Routing ──────────────────────────────────
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for group messages
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },

    // ── Message Content ───────────────────────────────────────
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.TEXT,
    },
    content: {
      type: String,
      default: '', // Encrypted ciphertext (E2EE)
    },

    // ── E2EE Encryption Metadata ──────────────────────────────
    iv: {
      type: String,
      default: '', // AES initialization vector
    },
    encryptedKeys: {
      type: Map,
      of: String, // Map<recipientUserId, AES key encrypted with their RSA public key>
      default: new Map(),
    },

    // ── Reply ─────────────────────────────────────────────────
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    // ── Delivery Status ───────────────────────────────────────
    deliveredTo: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        deliveredAt: { type: Date, default: Date.now },
      },
    ],
    readBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],

    // ── Edit & Delete ─────────────────────────────────────────
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ── Media Attachment ──────────────────────────────────────
    media: {
      type: Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },

    // ── Location (for location messages) ──────────────────────
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String, default: '' },
    },

    // ── Reactions ─────────────────────────────────────────────
    reactions: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
        reactedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Disappearing Messages ─────────────────────────────────
    expiresAt: {
      type: Date,
      default: null, // Set for disappearing messages
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

// ── Compound Indexes ──────────────────────────────────────────
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });

// ── TTL Index for disappearing messages ───────────────────────
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const Message = model('Message', messageSchema);

export default Message;
