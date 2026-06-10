import { User, Message, Group, Call, Notification, Payment, Media } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import bcrypt from 'bcryptjs';
import { getIo } from '../socket/index.js';

export const getMe = asyncHandler(async (req, res) => {
  // req.user is already populated by auth middleware
  res.status(200).json(ApiResponse.ok({ user: req.user }));
});

export const updateMe = asyncHandler(async (req, res) => {
  const { displayName, username, bio, avatar, status } = req.body;

  const updateData = { displayName, bio, avatar, status };
  if (username) {
    updateData.username = username;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );

  const io = getIo();
  io.emit('user_profile_updated', {
    userId: user._id,
    displayName: user.displayName,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    status: user.status
  });

  res.status(200).json(ApiResponse.ok({ user }, 'Profile updated successfully'));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const { privacy, notifications, security, ai } = req.body;

  const updateData = {};
  
  if (privacy) {
    for (const key in privacy) {
      updateData[`settings.privacy.${key}`] = privacy[key];
    }
  }
  if (notifications) {
    for (const key in notifications) {
      updateData[`settings.notifications.${key}`] = notifications[key];
    }
  }
  if (security) {
    for (const key in security) {
      updateData[`settings.security.${key}`] = security[key];
    }
  }
  if (ai) {
    for (const key in ai) {
      updateData[`settings.ai.${key}`] = ai[key];
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    { new: true }
  );

  try {
    const io = getIo();
    io.to(req.user._id.toString()).emit('settings_updated', { settings: user.settings });
  } catch (err) {}

  res.status(200).json(ApiResponse.ok({ settings: user.settings }, 'Settings updated successfully'));
});

export const updatePublicKey = asyncHandler(async (req, res) => {
  const { publicKey } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { publicKey },
    { new: true }
  );

  res.status(200).json(ApiResponse.ok({ publicKey: user.publicKey }, 'Public key updated'));
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username }).select('username displayName avatar bio status lastSeen publicKey settings.privacy.showProfilePhoto settings.privacy.showLastSeen settings.privacy.showStatus isPremium isAdmin premiumPlan');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Privacy handling logic could go here (e.g. obscuring lastSeen if user privacy dictates it)

  res.status(200).json(ApiResponse.ok({ user }));
});

export const searchUsers = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ],
    _id: { $nin: req.user.blockedUsers },
    blockedUsers: { $ne: req.user._id }
  })
    .limit(Number(limit))
    .select('username displayName avatar bio isPremium isAdmin premiumPlan');

  res.status(200).json(ApiResponse.ok({ users }));
});

export const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot block yourself');
  }

  const userToBlock = await User.findById(userId);
  if (!userToBlock) {
    throw ApiError.notFound('User to block not found');
  }

  if (!req.user.hasBlocked(userId)) {
    req.user.blockedUsers.push(userId);
    await req.user.save({ validateBeforeSave: false });
  }

  res.status(200).json(ApiResponse.ok(null, 'User blocked successfully'));
});

export const unblockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  req.user.blockedUsers = req.user.blockedUsers.filter(id => id.toString() !== userId);
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json(ApiResponse.ok(null, 'User unblocked successfully'));
});

export const setupChatLockPin = asyncHandler(async (req, res) => {
  const { pin, oldPin } = req.body;
  if (!pin || pin.length < 4) {
    throw ApiError.badRequest('PIN must be at least 4 characters long');
  }

  const user = await User.findById(req.user._id).select('+settings.security.chatLockPin');

  if (user.settings?.security?.chatLockPin) {
    if (!oldPin) throw ApiError.badRequest('Please provide your current PIN');
    const isMatch = await bcrypt.compare(oldPin, user.settings.security.chatLockPin);
    if (!isMatch) throw ApiError.unauthorized('Incorrect current PIN');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPin = await bcrypt.hash(pin, salt);

  if (!user.settings) user.settings = {};
  if (!user.settings.security) user.settings.security = {};
  user.settings.security.chatLockPin = hashedPin;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(ApiResponse.ok(null, 'Chat Lock PIN setup successfully'));
});

export const verifyChatLockPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  
  const user = await User.findById(req.user._id).select('+settings.security.chatLockPin');
  if (!user || !user.settings?.security?.chatLockPin) {
    throw ApiError.badRequest('Chat Lock PIN is not set up');
  }

  const isMatch = await bcrypt.compare(pin, user.settings.security.chatLockPin);
  if (!isMatch) {
    throw ApiError.badRequest('Incorrect PIN');
  }

  res.status(200).json(ApiResponse.ok({ verified: true }, 'PIN verified'));
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Find all 1-on-1 direct message groups involving the user
  const directMessageGroups = await Group.find({ 
    'members.user': userId, 
    name: 'Direct Message' 
  });
  const dmGroupIds = directMessageGroups.map(g => g._id);

  // 1b. Find all communities/groups created by this user
  const createdGroups = await Group.find({ creator: userId });
  const createdGroupIds = createdGroups.map(g => g._id);

  // 2. Delete all messages in DM groups, in created groups, and sent by this user elsewhere
  await Message.deleteMany({ 
    $or: [
      { conversationId: { $in: dmGroupIds } },
      { conversationId: { $in: createdGroupIds } },
      { sender: userId }
    ]
  });

  // 3. Delete the DM groups and the groups created by the user completely
  await Group.deleteMany({ _id: { $in: [...dmGroupIds, ...createdGroupIds] } });

  // 4. Remove user from remaining groups (e.g., communities)
  await Group.updateMany(
    { 'members.user': userId },
    { $pull: { members: { user: userId }, admins: userId, pendingRequests: { user: userId } } }
  );

  // 5. Delete any remaining groups where this user was the only member left
  await Group.deleteMany({ members: { $size: 0 } });

  // 4. Delete all calls
  await Call.deleteMany({ $or: [{ caller: userId }, { recipient: userId }] });

  // 5. Delete all notifications
  await Notification.deleteMany({ $or: [{ user: userId }, { sender: userId }] });

  // 6. Delete all payments
  await Payment.deleteMany({ user: userId });

  // 7. Delete all media uploaded by the user
  await Media.deleteMany({ uploader: userId });

  // 8. Delete the user
  await User.findByIdAndDelete(userId);

  // Notify clients
  const io = getIo();
  io.emit('user_deleted', { userId });

  res.status(200).json(ApiResponse.ok(null, 'Account and all associated data deleted successfully'));
});
