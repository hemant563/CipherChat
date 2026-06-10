import { User } from '../models/index.js';
import { SOCKET_EVENTS, USER_STATUS } from '../utils/constants.js';

export default (io, socket) => {
  // Broadcast online status only if user hasn't hidden their active status
  const hideStatus = socket.user.settings?.privacy?.hideActiveStatus === true;

  if (!hideStatus) {
    // Update status to online upon connection
    updateStatus(socket.user._id, USER_STATUS.ONLINE);
    
    socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId: socket.user._id,
      status: USER_STATUS.ONLINE
    });
  } else {
    // Keep it OFFLINE in the DB, but update lastSeen
    updateStatus(socket.user._id, USER_STATUS.OFFLINE);
  }

  socket.on('disconnect', () => {
    // Determine if user has other active connections
    const userRooms = io.sockets.adapter.rooms.get(socket.user._id.toString());
    
    if (!userRooms || userRooms.size === 0) {
      // User has fully disconnected from all tabs/devices
      updateStatus(socket.user._id, USER_STATUS.OFFLINE);

      if (!hideStatus) {
        socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
          userId: socket.user._id,
          status: USER_STATUS.OFFLINE,
          lastSeen: Date.now()
        });
      }
    }
  });

  socket.on('update_presence_settings', ({ hideActiveStatus }) => {
    if (!socket.user.settings) socket.user.settings = {};
    if (!socket.user.settings.privacy) socket.user.settings.privacy = {};
    
    const wasHidden = socket.user.settings.privacy.hideActiveStatus === true;
    socket.user.settings.privacy.hideActiveStatus = hideActiveStatus;

    if (wasHidden !== hideActiveStatus) {
      if (hideActiveStatus) {
        updateStatus(socket.user._id, USER_STATUS.OFFLINE);
        socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
          userId: socket.user._id,
          status: USER_STATUS.OFFLINE,
          lastSeen: Date.now()
        });
      } else {
        updateStatus(socket.user._id, USER_STATUS.ONLINE);
        socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
          userId: socket.user._id,
          status: USER_STATUS.ONLINE
        });
      }
    }
  });

  async function updateStatus(userId, status) {
    try {
      await User.findByIdAndUpdate(userId, { 
        status, 
        lastSeen: Date.now() 
      }, { validateBeforeSave: false });
    } catch (error) {
      // Error handling
    }
  }
};
