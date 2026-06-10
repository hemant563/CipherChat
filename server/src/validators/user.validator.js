import Joi from 'joi';
import { USER_STATUS } from '../utils/constants.js';

export const updateProfile = {
  body: Joi.object().keys({
    displayName: Joi.string().max(50).optional().allow(''),
    username: Joi.string().min(3).max(30).optional(),
    bio: Joi.string().max(200).optional().allow(''),
    avatar: Joi.string().uri().optional().allow(''),
    status: Joi.string().valid(...Object.values(USER_STATUS)).optional(),
  }),
};

export const updateSettings = {
  body: Joi.object().keys({
    privacy: Joi.object().keys({
      showLastSeen: Joi.boolean().optional(),
      showProfilePhoto: Joi.string().valid('everyone', 'contacts', 'nobody').optional(),
      showStatus: Joi.string().valid('everyone', 'contacts', 'nobody').optional(),
      readReceipts: Joi.boolean().optional(),
      accountPrivate: Joi.boolean().optional(),
      hideActiveStatus: Joi.boolean().optional(),
    }).optional(),
    notifications: Joi.object().keys({
      messages: Joi.boolean().optional(),
      groups: Joi.boolean().optional(),
      calls: Joi.boolean().optional(),
      sound: Joi.boolean().optional(),
      vibrate: Joi.boolean().optional(),
      hapticFeedback: Joi.boolean().optional(),
      desktopAlerts: Joi.boolean().optional(),
      messageTone: Joi.string().optional(),
    }).optional(),
    security: Joi.object().keys({
      twoStepVerification: Joi.boolean().optional(),
    }).optional(),
    ai: Joi.object().keys({
      smartReplies: Joi.boolean().optional(),
    }).optional(),
  }),
};

export const uploadPublicKey = {
  body: Joi.object().keys({
    publicKey: Joi.string().required(), // PEM formatted string
  }),
};

export const getProfile = {
  params: Joi.object().keys({
    username: Joi.string().required(),
  }),
};

export const searchUsers = {
  query: Joi.object().keys({
    q: Joi.string().required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

export const blockUser = {
  params: Joi.object().keys({
    userId: Joi.string().hex().length(24).required(),
  }),
};
