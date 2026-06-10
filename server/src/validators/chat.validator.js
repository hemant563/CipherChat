import Joi from 'joi';

export const getMessages = {
  params: Joi.object().keys({
    conversationId: Joi.string().required(),
  }),
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(100).default(50),
    cursor: Joi.string().hex().length(24).optional(), // last message ID for pagination
  }),
};

export const sendMessage = {
  params: Joi.object().keys({
    conversationId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    recipientId: Joi.string().hex().length(24).optional(), // required if not group
    groupId: Joi.string().hex().length(24).optional(), // required if group
    type: Joi.string().valid('text', 'image', 'video', 'audio', 'file', 'location').required(),
    content: Joi.string().required(), // ciphertext
    iv: Joi.string().required(),
    encryptedKeys: Joi.object().pattern(Joi.string().hex().length(24), Joi.string()).required(),
    replyTo: Joi.string().hex().length(24).optional(),
    mediaId: Joi.string().hex().length(24).optional(),
    location: Joi.object().keys({
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      address: Joi.string().optional(),
    }).optional(),
  }).xor('recipientId', 'groupId'), // Must have exactly one of these
};

export const editMessage = {
  params: Joi.object().keys({
    messageId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object().keys({
    content: Joi.string().required(), // new ciphertext
    iv: Joi.string().required(),
  }),
};

export const reactToMessage = {
  params: Joi.object().keys({
    messageId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object().keys({
    emoji: Joi.string().required(),
  }),
};
