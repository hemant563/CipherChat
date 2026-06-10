import mongoose from 'mongoose';
import { CALL_TYPE, CALL_STATUS } from '../utils/constants.js';

const { Schema, model } = mongoose;

/**
 * Call Schema
 * Tracks voice and video calls for history, logging, and WebRTC signaling state.
 */
const callSchema = new Schema(
  {
    caller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for group calls
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(CALL_TYPE),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CALL_STATUS),
      default: CALL_STATUS.RINGING,
    },

    // ── Timing ────────────────────────────────────────────────
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // seconds
      default: 0,
    },

    // ── Participants (for group calls) ────────────────────────
    participants: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        leftAt: {
          type: Date,
          default: null,
        },
      },
    ],
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
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ recipient: 1, createdAt: -1 });
callSchema.index({ status: 1 });

const Call = model('Call', callSchema);

export default Call;
