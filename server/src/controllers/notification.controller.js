import { Notification } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const { limit = 20, cursor } = req.query;

  const query = { recipient: req.user._id };
  
  if (cursor) {
    query._id = { $lt: cursor };
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.status(200).json(ApiResponse.ok({ notifications }));
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user._id },
    { isRead: true, readAt: Date.now() },
    { new: true }
  );

  if (!notification) throw ApiError.notFound('Notification not found');

  res.status(200).json(ApiResponse.ok({ notification }, 'Marked as read'));
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: Date.now() }
  );

  res.status(200).json(ApiResponse.ok(null, 'All notifications marked as read'));
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: id,
    recipient: req.user._id
  });

  if (!notification) throw ApiError.notFound('Notification not found');

  res.status(200).json(ApiResponse.ok(null, 'Notification deleted'));
});
