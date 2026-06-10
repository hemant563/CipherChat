import Joi from 'joi';

export const getMedia = {
  params: Joi.object().keys({
    mediaId: Joi.string().hex().length(24).required(),
  }),
};

export const uploadMedia = {
  body: Joi.object().keys({
    iv: Joi.string().required(), // Initialisation vector used to encrypt file client-side
    key: Joi.string().required(), // Encrypted AES key
  }),
  // Multer handles the file upload validation
};
