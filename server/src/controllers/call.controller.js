import { Call } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { CALL_STATUS } from '../utils/constants.js';

export const initiateCall = asyncHandler(async (req, res) => {
  const { recipientId, groupId, type } = req.body;

  if (!recipientId && !groupId) {
    throw ApiError.badRequest('Must provide recipientId or groupId');
  }

  const call = await Call.create({
    caller: req.user._id,
    recipient: recipientId || null,
    group: groupId || null,
    type,
    status: CALL_STATUS.RINGING,
    participants: [{ user: req.user._id }]
  });

  res.status(201).json(ApiResponse.created({ call }, 'Call initiated'));
});

export const answerCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const call = await Call.findById(callId);
  if (!call) throw ApiError.notFound('Call not found');

  call.status = CALL_STATUS.ONGOING;
  call.startedAt = Date.now();
  // Add recipient to participants if not already
  if (!call.participants.find(p => p.user.toString() === req.user._id.toString())) {
    call.participants.push({ user: req.user._id });
  }
  await call.save();
  res.status(200).json(ApiResponse.ok({ call }, 'Call answered'));
});

export const endCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  const call = await Call.findById(callId);
  if (!call) throw ApiError.notFound('Call not found');

  call.endedAt = Date.now();
  
  if (call.startedAt) {
    call.status = CALL_STATUS.ENDED;
    call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
  } else {
    // Call never started
    if (call.caller.toString() === req.user._id.toString()) {
      call.status = CALL_STATUS.MISSED; // Caller hung up
    } else {
      call.status = CALL_STATUS.REJECTED; // Recipient declined
    }
  }

  // Update participant leftAt for caller
  const participant = call.participants.find(p => p.user.toString() === req.user._id.toString());
  if (participant && !participant.leftAt) {
    participant.leftAt = Date.now();
  }

  await call.save();
  res.status(200).json(ApiResponse.ok({ call }, 'Call ended'));
});

export const getCallHistory = asyncHandler(async (req, res) => {
  const { limit = 20, cursor } = req.query;

  const query = {
    $or: [
      { caller: req.user._id },
      { recipient: req.user._id },
      { 'participants.user': req.user._id }
    ]
  };

  if (cursor) {
    query._id = { $lt: cursor };
  }

  const calls = await Call.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate('caller', 'username displayName avatar')
    .populate('recipient', 'username displayName avatar')
    .populate('group', 'name avatar');

  res.status(200).json(ApiResponse.ok({ calls }));
});
