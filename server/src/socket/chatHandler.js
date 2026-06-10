import { Message, Group } from '../models/index.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

export default (io, socket) => {
  
  // Join Conversation Room (useful for group chats)
  socket.on(SOCKET_EVENTS.JOIN_ROOM, async (roomId) => {
    socket.join(roomId);
    logger.debug(`User ${socket.user._id} joined room ${roomId}`);
  });

  socket.on(SOCKET_EVENTS.LEAVE_ROOM, (roomId) => {
    socket.leave(roomId);
    logger.debug(`User ${socket.user._id} left room ${roomId}`);
  });

  // Send Message
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data, callback) => {
    try {
      const { conversationId, recipientId, groupId, type, content, iv, encryptedKeys, replyTo, mediaId, location } = data;

      // Validate group membership if applicable
      if (groupId) {
        const group = await Group.findById(groupId);
        if (!group || !group.isMember(socket.user._id)) {
          if (callback) callback({ error: 'Not authorized for this group' });
          return;
        }
      } else if (recipientId) {
        // Direct message block validation
        const User = (await import('../models/User.js')).default;
        const sender = await User.findById(socket.user._id).select('blockedUsers');
        const recipient = await User.findById(recipientId).select('blockedUsers');
        
        if (!recipient) {
          if (callback) callback({ error: 'Recipient not found' });
          return;
        }
        
        const senderBlockedRecipient = sender.blockedUsers?.some(id => id.toString() === recipientId.toString());
        const recipientBlockedSender = recipient.blockedUsers?.some(id => id.toString() === socket.user._id.toString());
        
        if (senderBlockedRecipient) {
          if (callback) callback({ error: 'You have blocked this user. Unblock them to send a message.' });
          return;
        }
        
        if (recipientBlockedSender) {
          if (callback) callback({ error: 'Message could not be delivered.' });
          return;
        }
      }

      // Save to database
      const message = await Message.create({
        conversationId,
        sender: socket.user._id,
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

      await message.populate('sender', 'username displayName avatar publicKey');

      // Emit to recipient or group
      const targetRoom = groupId ? groupId.toString() : recipientId.toString();
      socket.to(targetRoom).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, message);
      
      // Also emit back to sender's other devices
      socket.to(socket.user._id.toString()).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, message);

      if (callback) callback({ success: true, message });
    } catch (error) {
      logger.error('Error sending message via socket:', error);
      if (callback) callback({ error: error.message });
    }
  });

  // Read Receipt
  socket.on(SOCKET_EVENTS.MARK_MESSAGES_READ, async ({ conversationId, recipientId, groupId }) => {
    try {
      // 1. Check if user has read receipts enabled
      const user = await import('../models/User.js').then(m => m.default || m.User).then(User => User.findById(socket.user._id).select('settings'));
      if (user?.settings?.privacy?.readReceipts === false) {
        // Silently ignore: user disabled read receipts, so they don't send them
        return;
      }

      // 2. Mark unread messages as read
      // We only mark messages where sender is NOT the current user, and readBy doesn't already have the user
      const query = {
        conversationId,
        sender: { $ne: socket.user._id },
        'readBy.user': { $ne: socket.user._id }
      };

      await Message.updateMany(query, {
        $push: { readBy: { user: socket.user._id, readAt: Date.now() } }
      });

      // 3. Emit event to the sender (or room)
      const targetRoom = groupId ? groupId.toString() : (recipientId ? recipientId.toString() : conversationId.toString());
      socket.to(targetRoom).emit(SOCKET_EVENTS.MESSAGES_READ, {
        conversationId,
        readByUserId: socket.user._id,
        readAt: Date.now()
      });
    } catch (error) {
      logger.error('Error updating read receipts:', error);
    }
  });

  // Delete Message
  socket.on(SOCKET_EVENTS.MESSAGE_DELETED, async ({ messageId, conversationId, recipientId, groupId }, callback) => {
    try {
      // Find the message and ensure it belongs to the user
      const message = await Message.findOne({ _id: messageId, sender: socket.user._id });
      if (!message) {
        if (callback) callback({ error: 'Message not found or unauthorized' });
        return;
      }

      // Hard delete from database
      await Message.findByIdAndDelete(messageId);

      // Broadcast deletion to recipient/group
      const targetRoom = groupId ? groupId.toString() : (recipientId ? recipientId.toString() : conversationId.toString());
      socket.to(targetRoom).emit(SOCKET_EVENTS.MESSAGE_DELETED, { messageId, conversationId });
      
      // Broadcast to sender's other tabs
      socket.to(socket.user._id.toString()).emit(SOCKET_EVENTS.MESSAGE_DELETED, { messageId, conversationId });

      if (callback) callback({ success: true, messageId, conversationId });
    } catch (error) {
      logger.error('Error deleting message:', error);
      if (callback) callback({ error: error.message });
    }
  });

  // Typing Indicators
  socket.on(SOCKET_EVENTS.TYPING_START, ({ conversationId, recipientId, groupId }) => {
    const targetRoom = groupId ? groupId.toString() : recipientId.toString();
    socket.to(targetRoom).emit(SOCKET_EVENTS.TYPING_START, {
      conversationId,
      userId: socket.user._id,
      username: socket.user.username
    });
  });

  socket.on(SOCKET_EVENTS.TYPING_STOP, ({ conversationId, recipientId, groupId }) => {
    const targetRoom = groupId ? groupId.toString() : recipientId.toString();
    socket.to(targetRoom).emit(SOCKET_EVENTS.TYPING_STOP, {
      conversationId,
      userId: socket.user._id
    });
  });
};
