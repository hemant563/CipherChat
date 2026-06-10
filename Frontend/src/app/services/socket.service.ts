import { Injectable, inject, NgZone } from '@angular/core';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);
  private listeners: { [event: string]: Function[] } = {};

  private addListener(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    
    const zonedCallback = (...args: any[]) => {
      this.ngZone.run(() => {
        callback(...args);
      });
    };
    
    this.listeners[event].push(zonedCallback);
    if (this.socket) {
      this.socket.on(event, zonedCallback as any);
    }
  }

  connect() {
    const token = this.authService.getToken();
    if (!token) return;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    // Attach any buffered listeners
    Object.keys(this.listeners).forEach(event => {
      this.listeners[event].forEach(callback => {
        this.socket!.on(event, callback as any);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChat(chatId: string) {
    if (this.socket) {
      this.socket.emit('join_room', chatId);
    }
  }

  leaveChat(chatId: string) {
    if (this.socket) {
      this.socket.emit('leave_room', chatId);
    }
  }

  sendMessage(messageData: any, callback?: (res: any) => void) {
    if (this.socket) {
      if (callback) {
        const zonedCallback = (res: any) => this.ngZone.run(() => callback(res));
        this.socket.emit('send_message', messageData, zonedCallback);
      } else {
        this.socket.emit('send_message', messageData);
      }
    }
  }

  onNewMessage(callback: (msg: any) => void) {
    this.addListener('message_received', callback);
  }

  onNewChat(callback: (data: any) => void) {
    this.addListener('new_chat', callback);
  }
  
  markAsRead(conversationId: string, recipientId: string) {
    if (this.socket) {
      this.socket.emit('mark_messages_read', { conversationId, recipientId });
    }
  }

  deleteMessage(data: any, callback?: (res: any) => void) {
    if (this.socket) {
      if (callback) {
        const zonedCallback = (res: any) => this.ngZone.run(() => callback(res));
        this.socket.emit('message_deleted', data, zonedCallback);
      } else {
        this.socket.emit('message_deleted', data);
      }
    }
  }

  onMessageDeleted(callback: (data: any) => void) {
    this.addListener('message_deleted', callback);
  }

  onMessagesRead(callback: (data: any) => void) {
    this.addListener('messages_read', callback);
  }
  
  onUserPresence(callback: (data: any) => void) {
    this.addListener('user_online', callback);
    this.addListener('user_offline', callback);
  }

  onUserProfileUpdated(callback: (data: any) => void) {
    this.addListener('user_profile_updated', callback);
  }

  sendTypingStart(data: { conversationId: string, recipientId?: string | null, groupId?: string | null }) {
    if (this.socket) {
      this.socket.emit('typing_start', data);
    }
  }

  sendTypingStop(data: { conversationId: string, recipientId?: string | null, groupId?: string | null }) {
    if (this.socket) {
      this.socket.emit('typing_stop', data);
    }
  }

  onTypingStart(callback: (data: any) => void) {
    this.addListener('typing_start', callback);
  }

  onTypingStop(callback: (data: any) => void) {
    this.addListener('typing_stop', callback);
  }

  // --- WebRTC Signaling ---

  initiateCall(data: any) {
    if (this.socket) {
      this.socket.emit('call_initiate', data);
    }
  }

  answerCall(data: any) {
    if (this.socket) {
      this.socket.emit('call_answer', data);
    }
  }

  rejectCall(data: any) {
    if (this.socket) {
      this.socket.emit('call_reject', data);
    }
  }

  endCall(data: any) {
    if (this.socket) {
      this.socket.emit('call_end', data);
    }
  }

  sendIceCandidate(data: any) {
    if (this.socket) {
      this.socket.emit('ice_candidate', data);
    }
  }

  onCallRinging(callback: (data: any) => void) {
    this.addListener('call_ringing', callback);
  }

  onCallAnswered(callback: (data: any) => void) {
    this.addListener('call_answer', callback);
  }

  onCallRejected(callback: (data: any) => void) {
    this.addListener('call_reject', callback);
  }

  onCallEnded(callback: (data: any) => void) {
    this.addListener('call_end', callback);
  }

  onIceCandidate(callback: (data: any) => void) {
    this.addListener('ice_candidate', callback);
  }

  updatePresenceSettings(hideActiveStatus: boolean) {
    if (this.socket) {
      this.socket.emit('update_presence_settings', { hideActiveStatus });
    }
  }

  onChatClearedAutonomous(callback: () => void) {
    this.addListener('chat_cleared_autonomous', callback);
  }

  // --- Contact Requests & Settings Sync ---
  onContactRequestReceived(callback: (data: any) => void) {
    this.addListener('contact_request_received', callback);
  }

  onContactRequestAccepted(callback: (data: any) => void) {
    this.addListener('contact_request_accepted', callback);
  }

  onContactRequestRejected(callback: (data: any) => void) {
    this.addListener('contact_request_rejected', callback);
  }

  onSettingsUpdated(callback: (data: any) => void) {
    this.addListener('settings_updated', callback);
  }
}
