import cron from 'node-cron';
import { User, Message, Group } from '../models/index.js';
import logger from '../utils/logger.js';
import { getIo } from '../socket/index.js';

export const initCronJobs = () => {
  // Run every midnight at 00:00 server time
  cron.schedule('0 0 * * *', async () => {
    logger.info('Starting autonomous midnight chat clearing for non-premium accounts...');
    
    try {
      // Find all free users
      const freeUsers = await User.find({ isPremium: { $ne: true }, isAdmin: { $ne: true } }).select('_id');
      
      let clearedCount = 0;
      for (const user of freeUsers) {
        // Find all groups/conversations user is a member of
        const groups = await Group.find({ 'members.user': user._id }).select('_id');
        const groupIds = groups.map(g => g._id);

        if (groupIds.length > 0) {
          // Push user's ID to deletedFor array of all messages in those conversations where they haven't deleted it yet
          const result = await Message.updateMany(
            { conversationId: { $in: groupIds }, deletedFor: { $ne: user._id } },
            { $push: { deletedFor: user._id } }
          );
          if (result.modifiedCount > 0) {
            clearedCount++;
          }
        }
      }
      
      logger.info(`Autonomous chat clearing completed. Cleared messages for ${clearedCount} free accounts.`);
      
      // Notify all connected clients to reload their active chat list to clear stale messages
      try {
        const io = getIo();
        io.emit('chat_cleared_autonomous');
      } catch (err) {
        // io might not be initialized yet if called early, but normally it is
      }
    } catch (error) {
      logger.error('Error during autonomous midnight chat clearing:', error);
    }
  });

  logger.info('Cron jobs initialized successfully');
};
