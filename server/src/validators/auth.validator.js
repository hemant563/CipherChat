import Joi from 'joi';

export const sendOtp = {
  body: Joi.object().keys({
    email: Joi.string()
      .email()
      .allow('')
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address',
      }),
    username: Joi.string().allow('').optional(),
  }).or('email', 'username'),
};

export const verifyOtp = {
  body: Joi.object().keys({
    email: Joi.string()
      .email()
      .allow('')
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address',
      }),
    otp: Joi.string().length(6).required(),
    username: Joi.string().allow('').optional(),
  }).or('email', 'username'),
};

export const resetPassword = {
  body: Joi.object().keys({
    username: Joi.string().required(),
    otp: Joi.string().length(6).required(),
    newPassword: Joi.string().min(6).required(),
  }),
};

export const register = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    otpToken: Joi.string().required(), // Temporary token received after verifying OTP
    username: Joi.string()
      .lowercase()
      .min(3)
      .max(30)
      .pattern(/^[a-z0-9_]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain lowercase letters, numbers, and underscores',
      }),
    password: Joi.string().min(6).required(),
    displayName: Joi.string().max(50).optional().allow(''),
    publicKey: Joi.string().optional().allow(''),
  }),
};

export const login = {
  body: Joi.object().keys({
    username: Joi.string().required(),
    password: Joi.string().required(),
    deviceId: Joi.string().optional(),
    deviceName: Joi.string().optional(),
  }),
};

export const refreshToken = {
  body: Joi.object().keys({
    refreshToken: Joi.string().optional(), // Fallback if not in cookie
  }),
};

export const checkUsername = {
  query: Joi.object().keys({
    username: Joi.string()
      .lowercase()
      .min(3)
      .max(30)
      .pattern(/^[a-z0-9_]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain lowercase letters, numbers, and underscores',
      }),
  }),
};
