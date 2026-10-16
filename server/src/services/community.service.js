import { Group, User } from '../models/index.js';
import { GROUP_ROLE, GROUP_TYPE } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Ensures the official CipherChat Community exists (created by an admin)
 * and ensures all registered users are automatically added as members.
 */
export const ensureCipherChatCommunity = async () => {
  try {
    // 1. Look for existing CipherChat Community
    let officialCommunity = await Group.findOne({
      type: GROUP_TYPE.COMMUNITY,
      name: { $regex: /^cipherchat/i },
      isActive: true,
    });

    // 2. If it doesn't exist, create it with an admin
    if (!officialCommunity) {
      let admin = await User.findOne({ isAdmin: true });
      if (!admin) {
        // Fallback to first registered user
        admin = await User.findOne({ password: { $exists: true } }).sort({ createdAt: 1 });
        if (admin) {
          admin.isAdmin = true;
          await admin.save({ validateBeforeSave: false });
        }
      }

      if (admin) {
        officialCommunity = await Group.create({
          name: 'CipherChat Community',
          description: 'Get the latest app updates, new features, announcements, and important news here. Stay connected and never miss what’s new.',
          avatar: '/logo.png',
          type: GROUP_TYPE.COMMUNITY,
          creator: admin._id,
          admins: [admin._id],
          members: [{ user: admin._id, role: GROUP_ROLE.OWNER }],
          settings: {
            category: 'Official',
            onlyAdminsCanMessage: false,
            approvalRequired: false,
            maxMembers: 1000000,
          },
        });
        logger.info(`Official CipherChat Community created with admin creator: ${admin.username}`);
      }
    }

    // 3. Ensure every registered user is in the community
    if (officialCommunity) {
      const allUsers = await User.find({ password: { $exists: true } }).select('_id');
      const existingMemberIds = new Set(
        officialCommunity.members.map((m) => m.user.toString())
      );

      const newMembers = [];
      for (const u of allUsers) {
        if (!existingMemberIds.has(u._id.toString())) {
          newMembers.push({
            user: u._id,
            role: GROUP_ROLE.MEMBER,
            joinedAt: new Date(),
          });
        }
      }

      if (newMembers.length > 0) {
        await Group.updateOne(
          { _id: officialCommunity._id },
          { $push: { members: { $each: newMembers } } }
        );
        logger.info(`Auto-added ${newMembers.length} users to the CipherChat Community`);
      }
    }
  } catch (error) {
    logger.error('Error ensuring CipherChat Community:', error);
  }
};

/**
 * Automatically add a specific user to the official CipherChat Community.
 */
export const addUserToCipherChatCommunity = async (userId) => {
  if (!userId) return;

  try {
    let officialCommunity = await Group.findOne({
      type: GROUP_TYPE.COMMUNITY,
      name: { $regex: /^cipherchat/i },
      isActive: true,
    });

    if (!officialCommunity) {
      await ensureCipherChatCommunity();
      officialCommunity = await Group.findOne({
        type: GROUP_TYPE.COMMUNITY,
        name: { $regex: /^cipherchat/i },
        isActive: true,
      });
    }

    if (officialCommunity) {
      const isAlreadyMember = officialCommunity.members.some(
        (m) => m.user.toString() === userId.toString()
      );

      if (!isAlreadyMember) {
        await Group.updateOne(
          { _id: officialCommunity._id },
          {
            $push: {
              members: {
                user: userId,
                role: GROUP_ROLE.MEMBER,
                joinedAt: new Date(),
              },
            },
          }
        );
        logger.info(`User ${userId} automatically added to CipherChat Community`);
      }
    }
  } catch (error) {
    logger.error(`Error adding user ${userId} to CipherChat Community:`, error);
  }
};
