import { Media } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import env from '../config/env.js';
import fs from 'fs';
import path from 'path';

export const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const { iv, key } = req.body;
  let mediaType = 'document';

  if (req.file.mimetype.startsWith('image/')) mediaType = 'image';
  else if (req.file.mimetype.startsWith('video/')) mediaType = 'video';
  else if (req.file.mimetype.startsWith('audio/')) mediaType = 'audio';

  // With CloudinaryStorage, req.file.path contains the remote URL
  const fileUrl = req.file.path;

  const media = await Media.create({
    uploader: req.user._id,
    type: mediaType,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: fileUrl,
    encryption: {
      iv: iv || '',
      key: key || '',
    }
  });

  res.status(201).json(ApiResponse.created({ media }, 'File uploaded successfully'));
});

export const getMediaInfo = asyncHandler(async (req, res) => {
  const { mediaId } = req.params;

  const media = await Media.findById(mediaId).populate('uploader', 'username');
  if (!media) throw ApiError.notFound('Media not found');

  if (media.isDeleted) throw ApiError.notFound('Media has been deleted');

  res.status(200).json(ApiResponse.ok({ media }));
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const { mediaId } = req.params;

  const media = await Media.findById(mediaId);
  if (!media) throw ApiError.notFound('Media not found');

  if (media.uploader.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Not authorized to delete this media');
  }

  media.isDeleted = true;
  await media.save();

  // Note: Since we are using Cloudinary, the file is hosted remotely.
  // We perform a soft delete here. If you want to permanently delete from Cloudinary,
  // you would use cloudinary.uploader.destroy() using the public_id extracted from the URL.

  res.status(200).json(ApiResponse.ok(null, 'Media deleted'));
});
