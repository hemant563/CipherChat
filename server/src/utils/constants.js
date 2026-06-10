/**
 * Application-wide constants and enums.
 */

export const USER_STATUS = Object.freeze({
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  DND: 'dnd',
});

export const MESSAGE_TYPE = Object.freeze({
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  LOCATION: 'location',
  SYSTEM: 'system',
});

export const GROUP_TYPE = Object.freeze({
  GROUP: 'group',
  COMMUNITY: 'community',
  CHANNEL: 'channel',
});

export const GROUP_ROLE = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
});

export const CALL_TYPE = Object.freeze({
  VOICE: 'voice',
  VIDEO: 'video',
});

export const CALL_STATUS = Object.freeze({
  RINGING: 'ringing',
  ONGOING: 'ongoing',
  ENDED: 'ended',
  MISSED: 'missed',
  REJECTED: 'rejected',
});

export const NOTIFICATION_TYPE = Object.freeze({
  MESSAGE: 'message',
  CALL: 'call',
  GROUP_INVITE: 'group_invite',
  FRIEND_REQUEST: 'friend_request',
  SYSTEM: 'system',
});

export const MEDIA_TYPE = Object.freeze({
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
});

// Allowed MIME types for file upload
export const ALLOWED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/plain',
]);

// Socket.IO event names
export const SOCKET_EVENTS = Object.freeze({
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // Chat
  SEND_MESSAGE: 'send_message',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  MARK_MESSAGES_READ: 'mark_messages_read',
  MESSAGES_READ: 'messages_read',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_DELETED: 'message_deleted',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  NEW_CHAT: 'new_chat',

  // Presence
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_STATUS_CHANGED: 'user_status_changed',

  // Calls
  CALL_INITIATE: 'call_initiate',
  CALL_RINGING: 'call_ringing',
  CALL_ANSWER: 'call_answer',
  CALL_REJECT: 'call_reject',
  CALL_END: 'call_end',
  ICE_CANDIDATE: 'ice_candidate',
  SDP_OFFER: 'sdp_offer',
  SDP_ANSWER: 'sdp_answer',

  // Groups
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',

  // Contact Requests
  CONTACT_REQUEST_RECEIVED: 'contact_request_received',
  CONTACT_REQUEST_ACCEPTED: 'contact_request_accepted',
  CONTACT_REQUEST_REJECTED: 'contact_request_rejected',

  // Settings
  SETTINGS_UPDATED: 'settings_updated',

  // Errors
  ERROR: 'error',
});
