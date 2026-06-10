import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Group, Message, User } from './src/models/index.js';

dotenv.config();

const cleanupGhosts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Fetch all Direct Message groups
    const dmGroups = await Group.find({ name: 'Direct Message' }).populate('members.user');

    let orphanedCount = 0;
    const orphanedGroupIds = [];

    for (const g of dmGroups) {
      // Find how many valid users actually exist in the group
      const validParticipants = g.members.map(m => m.user).filter(Boolean);
      
      // If a DM has fewer than 2 valid participants, one was permanently deleted
      if (validParticipants.length < 2) {
        orphanedCount++;
        orphanedGroupIds.push(g._id);
      }
    }

    console.log(`Found ${orphanedCount} orphaned DM groups by missing user reference.`);

    if (orphanedGroupIds.length > 0) {
      const messageResult = await Message.deleteMany({ conversationId: { $in: orphanedGroupIds } });
      console.log(`Deleted ${messageResult.deletedCount} orphaned messages.`);

      const groupResult = await Group.deleteMany({ _id: { $in: orphanedGroupIds } });
      console.log(`Deleted ${groupResult.deletedCount} orphaned groups.`);
    }

    console.log('Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
};

cleanupGhosts();
