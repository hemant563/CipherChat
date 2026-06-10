import { Group } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { GROUP_ROLE, GROUP_TYPE } from '../utils/constants.js';

export const createGroup = asyncHandler(async (req, res) => {
  const { name, description, type, members, settings } = req.body;

  const newMembers = [
    { user: req.user._id, role: GROUP_ROLE.OWNER }
  ];

  if (members && Array.isArray(members)) {
    members.forEach(userId => {
      if (userId !== req.user._id.toString()) {
        newMembers.push({ user: userId, role: GROUP_ROLE.MEMBER });
      }
    });
  }

  const groupData = {
    name,
    description,
    type,
    creator: req.user._id,
    admins: [req.user._id],
    members: newMembers,
  };

  if (settings) {
    groupData.settings = settings;
  }

  const group = await Group.create(groupData);

  res.status(201).json(ApiResponse.created({ group }, 'Group created'));
});

export const exploreGroups = asyncHandler(async (req, res) => {
  // Return all active communities
  const groups = await Group.find({
    isActive: true,
    type: GROUP_TYPE.COMMUNITY
  })
    .select('name description avatar type members settings')
    .limit(50);

  const formattedGroups = groups.map(g => {
    const isJoined = g.members.some(m => m.user.toString() === req.user._id.toString());
    const isPending = g.pendingRequests && g.pendingRequests.some(r => r.user.toString() === req.user._id.toString());
    return {
      _id: g._id,
      name: g.name,
      description: g.description,
      avatar: g.avatar,
      type: g.type,
      settings: g.settings,
      memberCount: g.members.length,
      isJoined,
      isPending
    };
  });

  res.status(200).json(ApiResponse.ok({ groups: formattedGroups }));
});

export const getMyGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ 'members.user': req.user._id, isActive: true })
    .populate('members.user', 'username displayName avatar publicKey status')
    .populate('pendingRequests.user', 'username displayName avatar')
    .sort({ createdAt: -1 });

  const filteredGroups = groups.filter(g => {
    return g.type === GROUP_TYPE.COMMUNITY;
  });

  res.status(200).json(ApiResponse.ok({ groups: filteredGroups }));
});

export const getGroupDetails = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId)
    .populate('members.user', 'username displayName avatar publicKey')
    .populate('creator', 'username displayName');

  if (!group) throw ApiError.notFound('Group not found');
  if (!group.isMember(req.user._id)) throw ApiError.forbidden('Not a member of this group');

  res.status(200).json(ApiResponse.ok({ group }));
});

export const updateGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { name, description, avatar, settings } = req.body;

  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');

  if (!group.isAdmin(req.user._id)) {
    throw ApiError.forbidden('Only admins can update group settings');
  }

  if (name) group.name = name;
  if (description !== undefined) group.description = description;
  if (avatar) group.avatar = avatar;
  if (settings) {
    group.settings = { ...group.settings, ...settings };
  }

  await group.save();
  res.status(200).json(ApiResponse.ok({ group }, 'Group updated'));
});

export const addMembers = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userIds } = req.body;

  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');

  if (!group.isAdmin(req.user._id)) {
    throw ApiError.forbidden('Only admins can add members');
  }

  let addedCount = 0;
  for (const userId of userIds) {
    if (!group.isMember(userId)) {
      group.members.push({ user: userId, role: GROUP_ROLE.MEMBER });
      addedCount++;
    }
  }

  await group.save();
  res.status(200).json(ApiResponse.ok({ group }, `${addedCount} members added`));
});

export const removeMember = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');

  const isSelf = req.user._id.toString() === userId;
  const isAdmin = group.isAdmin(req.user._id);

  if (!isSelf && !isAdmin) {
    throw ApiError.forbidden('Not authorized to remove this member');
  }

  group.members = group.members.filter(m => m.user.toString() !== userId);
  
  if (group.admins.includes(userId)) {
    group.admins = group.admins.filter(id => id.toString() !== userId);
  }

  await group.save();
  res.status(200).json(ApiResponse.ok(null, isSelf ? 'Left group' : 'Member removed'));
});

export const joinGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { inviteLink } = req.body;

  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');
  if (!group.isActive) throw ApiError.badRequest('Group is inactive');

  if (group.isMember(req.user._id)) {
    throw ApiError.badRequest('Already a member');
  }

  // Only require invite link if it's not a public community
  if (group.type !== GROUP_TYPE.COMMUNITY && group.inviteLink !== inviteLink) {
    throw ApiError.badRequest('Invalid invite link');
  }

  if (group.settings && group.settings.approvalRequired) {
    // Add to pending requests
    const alreadyRequested = group.pendingRequests.some(r => r.user.toString() === req.user._id.toString());
    if (!alreadyRequested) {
      group.pendingRequests.push({ user: req.user._id });
      await group.save();
    }
    return res.status(200).json(ApiResponse.ok(null, 'Join request sent and pending approval'));
  }

  group.members.push({ user: req.user._id, role: GROUP_ROLE.MEMBER });
  await group.save();

  res.status(200).json(ApiResponse.ok({ group }, 'Joined group successfully'));
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');

  if (group.creator.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the creator can delete the group');
  }

  // Note: For a robust app, we might also want to delete all messages related to this group,
  // but for now we simply remove the group record.
  await Group.findByIdAndDelete(groupId);

  res.status(200).json(ApiResponse.ok(null, 'Group deleted successfully'));
});

export const acceptJoinRequest = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');

  if (!group.isAdmin(req.user._id)) {
    throw ApiError.forbidden('Only admins can accept join requests');
  }

  // Remove from pending
  group.pendingRequests = group.pendingRequests.filter(r => r.user.toString() !== userId);
  
  // Add to members if not already
  if (!group.isMember(userId)) {
    group.members.push({ user: userId, role: GROUP_ROLE.MEMBER });
  }

  await group.save();
  res.status(200).json(ApiResponse.ok({ group }, 'Request accepted'));
});

export const rejectJoinRequest = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');

  if (!group.isAdmin(req.user._id)) {
    throw ApiError.forbidden('Only admins can reject join requests');
  }

  // Remove from pending
  group.pendingRequests = group.pendingRequests.filter(r => r.user.toString() !== userId);

  await group.save();
  res.status(200).json(ApiResponse.ok(null, 'Request rejected'));
});


