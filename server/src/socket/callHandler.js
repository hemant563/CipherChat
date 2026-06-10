import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * WebRTC Signaling over Socket.IO
 * Acts as a relay server to exchange SDP offers/answers and ICE candidates
 * so peers can establish a direct P2P connection for A/V calls.
 *
 * Signaling flow:
 *   Caller                   Server                   Callee
 *   ──────                   ──────                   ──────
 *   call_initiate (offer) ──►  relay  ──► call_ringing (offer)
 *                                         [user answers]
 *   call_answer (answer) ◄── relay  ◄── call_answer (answer)
 *   ice_candidate ────────►  relay  ──► ice_candidate
 *   ice_candidate ◄──────── relay  ◄── ice_candidate
 */
export default (io, socket) => {

  // ── Initiate Call ─────────────────────────────────────────────────────
  // Caller sends their SDP offer. We relay it directly to the target user.
  socket.on(SOCKET_EVENTS.CALL_INITIATE, (data) => {
    const { targetUserId, callType, offer, callId } = data;

    if (!targetUserId || !offer) {
      logger.warn(`[CallHandler] call_initiate missing required fields from ${socket.user.username}`);
      return;
    }

    logger.info(`[CallHandler] Call initiated: ${socket.user.username} → ${targetUserId} (${callType})`);

    // Relay the ringing event WITH the offer to the target's personal room
    socket.to(targetUserId.toString()).emit(SOCKET_EVENTS.CALL_RINGING, {
      callerId:       socket.user._id,
      callerUsername: socket.user.username,
      callerAvatar:   socket.user.avatar,
      callType,
      offer,          // SDP offer included so callee can answer immediately
      callId
    });
  });

  // ── Answer Call ───────────────────────────────────────────────────────
  // Callee sends their SDP answer. We relay it to the caller.
  socket.on(SOCKET_EVENTS.CALL_ANSWER, (data) => {
    const { callerId, answer, callId } = data;

    if (!callerId || !answer) {
      logger.warn(`[CallHandler] call_answer missing required fields from ${socket.user.username}`);
      return;
    }

    logger.info(`[CallHandler] Call answered: ${socket.user.username} → ${callerId}`);

    socket.to(callerId.toString()).emit(SOCKET_EVENTS.CALL_ANSWER, {
      responderId: socket.user._id,
      answer,
      callId
    });
  });

  // ── Reject Call ───────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CALL_REJECT, (data) => {
    const { callerId, reason } = data;

    if (!callerId) return;

    logger.info(`[CallHandler] Call rejected by ${socket.user.username}. Reason: ${reason || 'declined'}`);

    socket.to(callerId.toString()).emit(SOCKET_EVENTS.CALL_REJECT, {
      responderId: socket.user._id,
      reason:      reason || 'declined'
    });
  });

  // ── End Call ──────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CALL_END, (data) => {
    const { targetUserId } = data;

    if (!targetUserId) return;

    logger.info(`[CallHandler] Call ended by ${socket.user.username}`);

    socket.to(targetUserId.toString()).emit(SOCKET_EVENTS.CALL_END, {
      userId: socket.user._id
    });
  });

  // ── ICE Candidate Exchange ─────────────────────────────────────────────
  // Both peers emit ice_candidate events; we simply relay them to the target.
  socket.on(SOCKET_EVENTS.ICE_CANDIDATE, (data) => {
    const { targetUserId, candidate } = data;

    if (!targetUserId || !candidate) {
      logger.warn(`[CallHandler] ice_candidate missing fields from ${socket.user.username}`);
      return;
    }

    logger.debug(`[CallHandler] ICE candidate: ${socket.user.username} → ${targetUserId}`);

    socket.to(targetUserId.toString()).emit(SOCKET_EVENTS.ICE_CANDIDATE, {
      senderId:  socket.user._id,
      candidate  // Raw RTCIceCandidateInit object
    });
  });
};
