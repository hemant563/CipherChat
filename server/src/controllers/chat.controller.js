import { Message, User, Group } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getConversations = asyncHandler(async (req, res) => {
  // Fetch all groups the user is a member of
  const groups = await Group.find({ 'members.user': req.user._id })
    .populate('members.user', 'username displayName avatar publicKey status isPremium isAdmin premiumPlan')
    .sort({ updatedAt: -1 });

  const chats = await Promise.all(groups.map(async (g) => {
    const lastMessage = await Message.findOne({ 
      conversationId: g._id, 
      isDeleted: false, 
      deletedFor: { $ne: req.user._id } 
    }).sort({ createdAt: -1 }).select('content sender createdAt type isEdited');

    return {
      _id: g._id,
      isGroupChat: g.members.length > 2 || g.name !== 'Direct Message', // Simple heuristic for now
      name: g.name,
      avatar: g.avatar,
      participants: g.members.map(m => m.user).filter(Boolean),
      settings: g.settings,
      admins: g.admins,
      creator: g.creator,
      lastMessage: lastMessage,
      isLocked: req.user.lockedChats ? req.user.lockedChats.some(id => id.toString() === g._id.toString()) : false
    };
  }));

  res.status(200).json(ApiResponse.ok({ chats }));
});

export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { limit = 50, cursor } = req.query;

  const query = {
    conversationId,
    isDeleted: false,
    deletedFor: { $ne: req.user._id }
  };

  if (cursor) {
    query._id = { $lt: cursor };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate('sender', 'username displayName avatar publicKey isPremium isAdmin premiumPlan')
    .populate('replyTo');

  res.status(200).json(ApiResponse.ok({ messages }));
});

export const sendMessage = asyncHandler(async (req, res) => {
  // Note: Most messaging will happen via Socket.IO. This is a REST fallback.
  const { conversationId } = req.params;
  const { recipientId, groupId, type, content, iv, encryptedKeys, replyTo, mediaId, location } = req.body;

  let group = null;
  if (groupId) {
    group = await Group.findById(groupId);
    if (!group) throw ApiError.notFound('Group not found');
    if (!group.isMember(req.user._id)) throw ApiError.forbidden('Not a group member');
  }

  const message = await Message.create({
    conversationId,
    sender: req.user._id,
    recipient: recipientId || null,
    group: groupId || null,
    type,
    content,
    iv,
    encryptedKeys,
    replyTo: replyTo || null,
    media: mediaId || null,
    location: location || null,
  });

  await message.populate('sender', 'username displayName avatar publicKey isPremium isAdmin premiumPlan');

  res.status(201).json(ApiResponse.created({ message }, 'Message sent'));
});

export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content, iv } = req.body;

  const message = await Message.findById(messageId);
  if (!message) throw ApiError.notFound('Message not found');

  if (message.sender.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only edit your own messages');
  }

  message.content = content;
  message.iv = iv;
  message.isEdited = true;
  message.editedAt = Date.now();
  await message.save();

  res.status(200).json(ApiResponse.ok({ message }, 'Message edited'));
});

export const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  const message = await Message.findById(messageId);
  if (!message) throw ApiError.notFound('Message not found');

  const existingReactionIndex = message.reactions.findIndex(r => r.user.toString() === req.user._id.toString());
  
  if (existingReactionIndex > -1) {
    if (message.reactions[existingReactionIndex].emoji === emoji) {
      // Remove reaction if same
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Change reaction
      message.reactions[existingReactionIndex].emoji = emoji;
      message.reactions[existingReactionIndex].reactedAt = Date.now();
    }
  } else {
    // Add new reaction
    message.reactions.push({ user: req.user._id, emoji });
  }

  await message.save();
  res.status(200).json(ApiResponse.ok({ reactions: message.reactions }));
});

export const toggleChatLock = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  
  const user = await User.findById(req.user._id).select('+settings.security.chatLockPin lockedChats');
  if (!user.settings?.security?.chatLockPin) {
    throw ApiError.badRequest('Please set up a Chat Lock PIN first');
  }

  const isLockedIndex = user.lockedChats.findIndex(id => id.toString() === conversationId);
  let isLocked = false;

  if (isLockedIndex > -1) {
    // Unlock it
    user.lockedChats.splice(isLockedIndex, 1);
  } else {
    // Lock it
    user.lockedChats.push(conversationId);
    isLocked = true;
  }

  await user.save({ validateBeforeSave: false });

  res.status(200).json(ApiResponse.ok({ isLocked }, `Chat ${isLocked ? 'locked' : 'unlocked'}`));
});

export const clearConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  
  await Message.updateMany(
    { conversationId, deletedFor: { $ne: req.user._id } },
    { $push: { deletedFor: req.user._id } }
  );

  res.status(200).json(ApiResponse.ok(null, 'Chat cleared successfully for user'));
});
