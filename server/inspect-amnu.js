import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Group } from './src/models/index.js';

dotenv.config();

const inspectUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find manu
    const amnu = await User.findOne({ 
      $or: [
        { username: { $regex: /manu/i } },
        { displayName: { $regex: /manu/i } }
      ]
    });

    if (!amnu) {
      console.log('User amnu not found.');
      process.exit(0);
    }

    console.log(`Found amnu: ${amnu.username} (ID: ${amnu._id})`);

    const groups = await Group.find({ 'members.user': amnu._id })
      .populate('members.user', 'username displayName avatar');

    console.log(`Amnu is in ${groups.length} groups.`);

    for (const g of groups) {
      const participants = g.members.map(m => m.user).filter(Boolean);
      let chatName = g.name;
      let isGroup = g.members.length > 2 || g.name !== 'Direct Message';
      
      if (!isGroup) {
        const otherUser = participants.find(p => p._id.toString() !== amnu._id.toString());
        if (otherUser) {
          chatName = otherUser.displayName || otherUser.username;
        }
      }
      
      console.log(`Chat: ${g._id}, Name: ${chatName}, IsGroup: ${isGroup}, Participants: ${participants.length}`);
      if (!chatName) {
         console.log('>>> THIS CHAT HAS NO NAME! <<<');
         console.log('Group data:', JSON.stringify(g, null, 2));
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

inspectUser();
