import mongoose from 'mongoose';
import { MEDIA_TYPE } from '../utils/constants.js';

const { Schema, model } = mongoose;

/**
 * Media Schema
 * Tracks uploaded files with metadata, thumbnails, and encryption info.
 */
const mediaSchema = new Schema(
  {
    uploader: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(MEDIA_TYPE),
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number, // bytes
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },

    // ── Encryption metadata (for E2EE file sharing) ──────────
    encryption: {
      iv: { type: String, default: '' },
      key: { type: String, default: '' }, // Encrypted AES key
    },

    // ── Soft delete ───────────────────────────────────────────
    isDeleted: {
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
mediaSchema.index({ uploader: 1, createdAt: -1 });

const Media = model('Media', mediaSchema);

export default Media;
