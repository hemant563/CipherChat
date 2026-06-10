import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import { ALLOWED_MIME_TYPES } from '../utils/constants.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Multer storage config (Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Cloudinary automatically handles resource_type 'auto' for videos/raw files
    let resource_type = 'auto';
    if (file.mimetype.startsWith('image/')) resource_type = 'image';
    else if (file.mimetype.startsWith('video/')) resource_type = 'video';
    else resource_type = 'raw'; // for pdf, docx, etc.

    const name = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
    
    return {
      folder: 'chatsphere_uploads',
      resource_type: resource_type,
      public_id: `${Date.now()}_${name}`,
    };
  },
});

// File filter based on allowed MIME types
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`), false);
  }
};

// Configured multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});

export default upload;
