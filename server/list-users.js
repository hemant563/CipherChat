import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/index.js';

dotenv.config();

const listUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find().select('username displayName');
    console.log(users);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

listUsers();
