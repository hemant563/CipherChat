import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Group, Message } from '../src/models/index.js';
import { MESSAGE_TYPE } from '../src/utils/constants.js';

dotenv.config();

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatsphere';

async function seedData() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(DB_URI);
    console.log('Connected.');

    console.log('Clearing old sample data...');
    // Only delete users with specific usernames to avoid wiping real accounts if any
    const sampleUsernames = ['alice', 'bob', 'charlie'];
    await User.deleteMany({ username: { $in: sampleUsernames } });
    
    // For simplicity we will wipe all Groups and Messages for now to get a clean slate for chats
    await Group.deleteMany({});
    await Message.deleteMany({});

    console.log('Creating users...');
    const alice = new User({ username: 'alice', password: 'password123', displayName: 'Alice Smith', phone: '+10000000001', isVerified: true });
    const bob = new User({ username: 'bob', password: 'password123', displayName: 'Bob Jones', phone: '+10000000002', isVerified: true });
    const charlie = new User({ username: 'charlie', password: 'password123', displayName: 'Charlie Brown', phone: '+10000000003', isVerified: true });

    // Add each other to contacts
    alice.contacts = [bob._id, charlie._id];
    bob.contacts = [alice._id, charlie._id];
    charlie.contacts = [alice._id, bob._id];

    await alice.save();
    await bob.save();
    await charlie.save();

    console.log('Creating groups/chats...');
    // Alice and Bob Direct Message
    const chatAB = await Group.create({
      name: 'Direct Message',
      creator: alice._id,
      members: [
        { user: alice._id, role: 'admin' },
        { user: bob._id, role: 'admin' }
      ]
    });

    // Alice and Charlie Direct Message
    const chatAC = await Group.create({
      name: 'Direct Message',
      creator: charlie._id,
      members: [
        { user: alice._id, role: 'admin' },
        { user: charlie._id, role: 'admin' }
      ]
    });

    console.log('Creating messages...');
    // Messages for Alice <-> Bob
    const msgsAB = [
      { sender: alice._id, text: "Hey Bob, how's it going?" },
      { sender: bob._id, text: "Hi Alice! Doing well, just working on the ChatSphere app." },
      { sender: alice._id, text: "Awesome! The new auth flow looks great." },
      { sender: bob._id, text: "Thanks! We still need to implement message decryption though." }
    ];

    for (let i = 0; i < msgsAB.length; i++) {
      await Message.create({
        conversationId: chatAB._id.toString(),
        sender: msgsAB[i].sender,
        recipient: msgsAB[i].sender.toString() === alice._id.toString() ? bob._id : alice._id,
        group: chatAB._id,
        type: MESSAGE_TYPE.TEXT,
        content: msgsAB[i].text,
        createdAt: new Date(Date.now() - (10 - i) * 60000) // Staggered times
      });
    }

    // Messages for Alice <-> Charlie
    const msgsAC = [
      { sender: charlie._id, text: "Alice, did you get my email?" },
      { sender: alice._id, text: "Yes, I'll review it this afternoon." }
    ];

    for (let i = 0; i < msgsAC.length; i++) {
      await Message.create({
        conversationId: chatAC._id.toString(),
        sender: msgsAC[i].sender,
        recipient: msgsAC[i].sender.toString() === alice._id.toString() ? charlie._id : alice._id,
        group: chatAC._id,
        type: MESSAGE_TYPE.TEXT,
        content: msgsAC[i].text,
        createdAt: new Date(Date.now() - (5 - i) * 60000)
      });
    }

    console.log('Sample data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
