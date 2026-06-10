import User from '../models/User.js';
import Group from '../models/Group.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { getIo } from '../socket/index.js';
import { SOCKET_EVENTS } from '../utils/constants.js';

/**
 * @desc    Send a contact request by username
 * @route   POST /api/v1/contacts/request
 * @access  Private
 */
export const sendRequest = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const senderId = req.user._id;

  if (!username) {
    throw new ApiError(400, 'Username is required');
  }

  const recipient = await User.findOne({ username: username.toLowerCase() });

  if (!recipient) {
    throw new ApiError(404, 'User not found');
  }

  if (recipient._id.toString() === senderId.toString()) {
    throw new ApiError(400, 'You cannot send a request to yourself');
  }

  if (recipient.contacts.includes(senderId)) {
    throw new ApiError(400, 'User is already in your contacts');
  }

  if (recipient.pendingRequests.includes(senderId)) {
    throw new ApiError(400, 'Contact request already sent');
  }

  // Add sender to recipient's pending requests
  recipient.pendingRequests.push(senderId);
  await recipient.save();

  try {
    const io = getIo();
    io.to(recipient._id.toString()).emit(SOCKET_EVENTS.CONTACT_REQUEST_RECEIVED, {
      senderId: req.user._id,
      senderUsername: req.user.username,
      senderDisplayName: req.user.displayName,
      senderAvatar: req.user.avatar
    });
  } catch (err) {}

  res.status(200).json(new ApiResponse(200, null, 'Contact request sent successfully'));
});

/**
 * @desc    Get pending contact requests
 * @route   GET /api/v1/contacts/requests
 * @access  Private
 */
export const getRequests = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('pendingRequests', 'displayName username avatar');

  res.status(200).json(new ApiResponse(200, { requests: user.pendingRequests }, 'Requests fetched successfully'));
});

/**
 * @desc    Accept a contact request
 * @route   POST /api/v1/contacts/accept/:id
 * @access  Private
 */
export const acceptRequest = asyncHandler(async (req, res) => {
  const senderId = req.params.id; // ID of the user who sent the request
  const recipientId = req.user._id; // Current user

  const recipient = await User.findById(recipientId);
  const sender = await User.findById(senderId);

  if (!sender) {
    throw new ApiError(404, 'User not found');
  }

  if (!recipient.pendingRequests.includes(senderId)) {
    throw new ApiError(400, 'No pending request found from this user');
  }

  // Remove from pending, add to contacts
  recipient.pendingRequests = recipient.pendingRequests.filter(id => id.toString() !== senderId.toString());
  recipient.contacts.push(senderId);
  await recipient.save();

  if (!sender.contacts.includes(recipientId)) {
    sender.contacts.push(recipientId);
    await sender.save();
  }

  // Check if a chat already exists
  let chat = await Group.findOne({
    type: 'GROUP', // default, wait actually let's see what is appropriate. Maybe just check members?
    'members.user': { $all: [senderId, recipientId] }
  });

  if (!chat) {
    chat = await Group.create({
      name: 'Direct Message',
      creator: senderId,
      members: [
        { user: senderId, role: 'admin' },
        { user: recipientId, role: 'admin' }
      ]
    });
  }

  // Notify the sender that a new chat was created so their UI updates
  try {
    const io = getIo();
    io.to(senderId.toString()).emit(SOCKET_EVENTS.NEW_CHAT, { chat });
    io.to(senderId.toString()).emit(SOCKET_EVENTS.CONTACT_REQUEST_ACCEPTED, { recipientId });
  } catch (err) {
    // If socket is not initialized or user is offline, ignore
  }

  res.status(200).json(new ApiResponse(200, { chat }, 'Contact request accepted'));
});

/**
 * @desc    Reject a contact request
 * @route   POST /api/v1/contacts/reject/:id
 * @access  Private
 */
export const rejectRequest = asyncHandler(async (req, res) => {
  const senderId = req.params.id;
  const recipientId = req.user._id;

  const recipient = await User.findById(recipientId);

  if (!recipient.pendingRequests.includes(senderId)) {
    throw new ApiError(400, 'No pending request found from this user');
  }

  recipient.pendingRequests = recipient.pendingRequests.filter(id => id.toString() !== senderId.toString());
  await recipient.save();

  try {
    const io = getIo();
    io.to(senderId.toString()).emit(SOCKET_EVENTS.CONTACT_REQUEST_REJECTED, { recipientId });
  } catch (err) {}

  res.status(200).json(new ApiResponse(200, null, 'Contact request rejected'));
});
