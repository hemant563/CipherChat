import { Component, inject, OnInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { UserService } from '../../services/user.service';
import { CallService } from '../../services/call.service';
import { MediaService } from '../../services/media.service';
import { ToastService } from '../../services/toast.service';
import { PresenceService } from '../../services/presence.service';
import { SoundService } from '../../services/sound.service';
import { HapticService } from '../../services/haptic.service';
import { NotificationService } from '../../services/notification.service';
import { ParticleBgComponent } from '../../components/particle-bg/particle-bg.component';

export interface Message {
  _id?: string;
  id?: string;
  sender: any;
  content: string;
  createdAt?: string;
  timestamp?: string;
  readBy?: any[];
}

export interface Chat {
  _id: string;
  id?: string;
  isGroupChat: boolean;
  name: string;
  avatar?: string;
  participants: any[];
  messages: Message[];
  handle?: string;
  isOnline?: boolean;
  isLocked?: boolean;
  otherUserId?: string;
  isPremium?: boolean;
  isAdmin?: boolean;
  premiumPlan?: string;
  unreadCount?: number;
  lastMessage?: any;
}

@Component({
  selector: 'app-chat-dashboard',
  imports: [CommonModule, FormsModule, ParticleBgComponent],
  templateUrl: './chat-dashboard.html',
  styleUrl: './chat-dashboard.css',
})
export class ChatDashboard implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private socketService = inject(SocketService);
  private userService = inject(UserService);
  private callService = inject(CallService);
  private mediaService = inject(MediaService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private soundService = inject(SoundService);
  private hapticService = inject(HapticService);
  private notificationService = inject(NotificationService);
  presenceService = inject(PresenceService);

  myUser = signal<any>(null);
  searchQuery = signal<string>('');
  chats = signal<Chat[]>([]);
  activeChatId = signal<string | null>(null);
  newMessageText = signal<string>('');
  
  smartReplies = signal<string[]>([]);
  aiLoading = signal(false);

  typingUsers = signal<{ [chatId: string]: { userId: string, username: string }[] }>({});
  private typingTimeouts: { [chatId: string]: any } = {};
  private emitTypingTimeout: any = null;

  showAddContactModal = signal(false);
  newContactUsername = signal('');
  pendingRequests = signal<any[]>([]);
  showRequestsModal = signal(false);

  showChatList = signal(false);
  isSidebarCollapsed = signal(false);

  toggleSidebarCollapse() {
    this.isSidebarCollapsed.update(v => !v);
  }


  // --- User Profile & Blocking State ---
  showUserProfile = signal(false);
  selectedUserProfile = signal<any>(null);

  // --- Auto-Delete State ---
  autoDeleteSettings = signal<{ [chatId: string]: 'midnight' | 'after_view' | 'off' }>({});
  showAutoDeleteMenu = signal(false);

  // --- Chat Lock State ---
  unlockedSessionChats = signal<Set<string>>(new Set());
  showSetPinModal = signal(false);
  showUnlockModal = signal(false);
  pinInput = signal('');
  pinError = signal('');
  chatToUnlock = signal<string | null>(null);

  showEmojiPicker = signal(false);
  emojis = ['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾', '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤙', '🤘', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '💪', '🦾', '🖕', '✍️', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '✨', '🌟', '💫', '💥', '💢', '💦', '💧', '💤', '💨', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '骨', '👀', '👁️', '👅', '👄'];

  trackByChat(index: number, chat: any): string {
    return chat._id || chat.id;
  }

  trackByMsg(index: number, msg: any): string {
    return msg._id || msg.id || index.toString();
  }

  activeChat = computed(() => {
    return this.chats().find(c => c._id === this.activeChatId() || c.id === this.activeChatId());
  });

  filteredChats = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.chats();
    return this.chats().filter(c =>
      c.name?.toLowerCase().includes(q)
    );
  });

  canSendMessage = computed(() => {
    const chat = this.activeChat();
    if (!chat) return false;
    if (!chat.isGroupChat) return true;
    
    const settings = (chat as any).settings;
    if (settings && settings.onlyAdminsCanMessage) {
      const userId = this.myUser()?._id;
      const creatorId = (chat as any).creator;
      const admins = (chat as any).admins || [];
      const isAdmin = creatorId === userId || admins.some((id: any) => id === userId || id?._id === userId);
      return isAdmin;
    }
    return true;
  });

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem('autoDeleteSettings');
      if (storedSettings) {
        try {
          this.autoDeleteSettings.set(JSON.parse(storedSettings));
        } catch (e) {}
      }

      this.userService.currentUser$.subscribe(user => {
        if (user) {
          const isFirstLoad = !this.myUser();
          this.myUser.set(user);
          if (isFirstLoad) {
            this.loadChats();
            this.loadPendingRequests();
          }
        }
      });

      // Fetch fresh data
      this.userService.getProfile().subscribe();

      // Setup socket listeners
      this.socketService.onNewMessage((msg) => {
          this.handleIncomingMessage(msg);
          this.scrollToBottom();
        });

      this.socketService.onChatClearedAutonomous(() => {
        this.loadChats();
      });


        this.socketService.onMessagesRead((data) => {
          this.handleMessagesRead(data);
        });

        this.socketService.onMessageDeleted((data) => {
          const { messageId, conversationId } = data;
          this.chats.update(chats => {
            const chatIndex = chats.findIndex(c => c._id === conversationId || c.id === conversationId);
            if (chatIndex > -1) {
              const updatedChat = {
                ...chats[chatIndex],
                messages: chats[chatIndex].messages.filter(m => m._id !== messageId && m.id !== messageId)
              };
              const newChats = [...chats];
              newChats[chatIndex] = updatedChat;
              return newChats;
            }
            return chats;
          });
        });

        this.socketService.onNewChat((data) => {
          this.loadChats();
        });

        this.socketService.onUserPresence((data) => {
          const { userId, status } = data;
          this.chats.update(chats => chats.map(c => {
            if (!c.isGroupChat) {
              const otherUser = c.participants.find((p: any) => p && p._id !== this.myUser()?._id);
              if (otherUser && (otherUser._id === userId || otherUser.id === userId)) {
                return { ...c, isOnline: status === 'online' };
              }
            }
            return c;
          }));
        });

        this.socketService.onTypingStart((data) => {
          const { conversationId, userId, username } = data;
          this.typingUsers.update(tu => {
            const current = tu[conversationId] || [];
            if (!current.find(u => u.userId === userId)) {
              return { ...tu, [conversationId]: [...current, { userId, username }] };
            }
            return tu;
          });
          
          const timeoutKey = `${conversationId}_${userId}`;
          if (this.typingTimeouts[timeoutKey]) clearTimeout(this.typingTimeouts[timeoutKey]);
          this.typingTimeouts[timeoutKey] = setTimeout(() => {
            this.typingUsers.update(tu => {
              const current = tu[conversationId] || [];
              return { ...tu, [conversationId]: current.filter(u => u.userId !== userId) };
            });
          }, 3000);
        });

        this.socketService.onTypingStop((data) => {
          const { conversationId, userId } = data;
          this.typingUsers.update(tu => {
            const current = tu[conversationId] || [];
            return { ...tu, [conversationId]: current.filter(u => u.userId !== userId) };
          });
        });

        this.socketService.onUserProfileUpdated((data) => {
          const { userId, displayName, username, avatar, bio, status } = data;
          this.chats.update(chats => chats.map(c => {
            if (!c.isGroupChat) {
              const otherUser = c.participants.find((p: any) => p && p._id !== this.myUser()?._id);
              if (otherUser && (otherUser._id === userId || otherUser.id === userId)) {
                return { ...c, name: displayName || username, avatar: avatar };
              }
            }
            return c;
          }));
          if (this.selectedUserProfile() && (this.selectedUserProfile()._id === userId || this.selectedUserProfile().id === userId)) {
             this.selectedUserProfile.set({ ...this.selectedUserProfile(), displayName, username, avatar, bio, status });
          }
        });

        this.socketService.onContactRequestReceived((data) => {
          this.loadPendingRequests();
          this.notificationService.showDesktopNotification('New Contact Request', {
            body: `${data.senderDisplayName || data.senderUsername} sent you a request.`
          });
        });

        this.socketService.onContactRequestAccepted((data) => {
          this.loadPendingRequests();
          this.loadChats();
        });

        this.socketService.onContactRequestRejected((data) => {
          this.loadPendingRequests();
        });

        this.socketService.onSettingsUpdated((data) => {
          if (this.myUser()) {
            this.userService.currentUser$.next({
              ...this.myUser(),
              settings: data.settings
            });
            this.myUser.set(this.userService.currentUser$.value);
          }
        });
    }
  }

  ngOnDestroy() {
    // Socket disconnection is now handled globally in app-layout
  }

  loadChats() {
    this.chatService.getRecentConversations().subscribe({
      next: (res) => {
        const mappedChats = res.data.chats.map((c: any) => {
          const otherUser = c.participants.find((p: any) => p && p._id !== this.myUser()?._id);
          if (!c.isGroupChat && otherUser) {
            this.presenceService.initializeStatus(otherUser._id, otherUser.status === 'online', otherUser.lastSeen);
          }
          return {
            ...c,
            id: c._id,
            name: c.isGroupChat ? c.name : (otherUser?.displayName || otherUser?.username || 'Deleted User'),
            avatar: c.isGroupChat ? c.avatar : otherUser?.avatar,
            otherUserId: otherUser?._id,
            isPremium: c.isGroupChat ? false : (otherUser?.isPremium || false),
            isAdmin: c.isGroupChat ? false : (otherUser?.isAdmin || false),
            premiumPlan: c.isGroupChat ? 'none' : (otherUser?.premiumPlan || 'none'),
            unreadCount: 0,
            messages: []
          };
        });
        this.chats.set(mappedChats);
      },
      error: (err) => console.error('Failed to load chats', err)
    });
  }

  selectChat(chatId: string | undefined) {
    if (!chatId) return;

    const currentActive = this.activeChatId();
    if (currentActive && currentActive !== chatId) {
      this.checkAutoDeleteOnLeave(currentActive);
    }

    if (chatId === this.activeChatId()) {
      // Deselect the chat if it's already active
      this.checkAutoDeleteOnLeave(chatId);
      this.socketService.leaveChat(this.activeChatId()!);
      this.activeChatId.set(null);
      
      // If it was locked, remove from session unlocks so it locks again
      this.unlockedSessionChats.update(set => {
        const newSet = new Set(set);
        newSet.delete(chatId);
        return newSet;
      });
      return;
    }

    const targetChat = this.chats().find(c => c._id === chatId || c.id === chatId);
    if (targetChat && (targetChat as any).isLocked && !this.unlockedSessionChats().has(chatId)) {
      this.chatToUnlock.set(chatId);
      this.showUnlockModal.set(true);
      return;
    }

    if (this.activeChatId()) {
      this.socketService.leaveChat(this.activeChatId()!);
    }

    // Clear unread count when selected
    this.chats.update(chats => {
      const chatIndex = chats.findIndex(c => c._id === chatId || c.id === chatId);
      if (chatIndex > -1 && chats[chatIndex].unreadCount) {
        const newChats = [...chats];
        newChats[chatIndex] = { ...newChats[chatIndex], unreadCount: 0 };
        return newChats;
      }
      return chats;
    });

    this.activeChatId.set(chatId);
    this.showChatList.set(false);
    this.socketService.joinChat(chatId);

    this.loadMessagesForSelectedChat(chatId);
  }

  loadMessagesForSelectedChat(chatId: string) {
    this.checkAutoDeleteOnLoad(chatId);
    
    // Load messages for selected chat
    this.chatService.getMessages(chatId).subscribe({
      next: (res) => {
        this.chats.update(chats => {
          const chatIndex = chats.findIndex(c => c._id === chatId || c.id === chatId);
          if (chatIndex > -1) {
            const updatedChat = { ...chats[chatIndex], messages: res.data.messages.slice().reverse() };
            const newChats = [...chats];
            newChats[chatIndex] = updatedChat;
            this.scrollToBottom();
            setTimeout(() => {
              this.checkSmartReplies();
              // Mark as read if setting is enabled
              if (this.myUser()?.settings?.privacy?.readReceipts !== false) {
                const recipientId = updatedChat.isGroupChat ? null : updatedChat.participants.find((p: any) => p && p._id !== this.myUser()?._id)?._id;
                this.socketService.markAsRead(chatId, recipientId);
              }
            }, 100);
            return newChats;
          }
          return chats;
        });
      }
    });
  }

  sendMessage() {
    this.showEmojiPicker.set(false);
    const text = this.newMessageText().trim();
    const chatId = this.activeChatId();
    if (!text || !chatId) return;

    this.smartReplies.set([]);

    const chat = this.activeChat();
    
    // Even if backend flagged it as group chat, if it only has 2 members, treat it as a direct message
    const isActuallyGroupChat = chat?.isGroupChat && chat?.participants?.length > 2;
    
    const recipientId = isActuallyGroupChat ? null : chat?.participants.find((p: any) => p && p._id !== this.myUser()?._id)?._id;

    this.socketService.sendMessage({
      type: 'text',
      content: text,
      conversationId: chatId,
      groupId: isActuallyGroupChat ? chatId : null,
      recipientId: recipientId,
      iv: 'dummy_iv_for_now',
      encryptedKeys: []
    }, (res) => {
      if (res && res.success && res.message) {
        this.soundService.playMessageSentSound();
        this.hapticService.vibrateImportantAction();
        this.handleIncomingMessage(res.message);
        this.scrollToBottom();
      }
    });

    this.newMessageText.set('');
    
    // Stop typing immediately when sending
    const chat2 = this.activeChat();
    const isGrp = chat2?.isGroupChat && chat2?.participants?.length > 2;
    const recId = isGrp ? null : chat2?.participants.find((p: any) => p && p._id !== this.myUser()?._id)?._id;
    this.socketService.sendTypingStop({
      conversationId: chatId,
      groupId: isGrp ? chatId : null,
      recipientId: recId
    });
  }

  onTyping() {
    const chatId = this.activeChatId();
    if (!chatId) return;

    const chat = this.activeChat();
    const isActuallyGroupChat = chat?.isGroupChat && chat?.participants?.length > 2;
    const recipientId = isActuallyGroupChat ? null : chat?.participants.find((p: any) => p && p._id !== this.myUser()?._id)?._id;

    if (!this.emitTypingTimeout) {
      this.socketService.sendTypingStart({
        conversationId: chatId,
        groupId: isActuallyGroupChat ? chatId : null,
        recipientId: recipientId
      });
    } else {
      clearTimeout(this.emitTypingTimeout);
    }

    this.emitTypingTimeout = setTimeout(() => {
      this.socketService.sendTypingStop({
        conversationId: chatId,
        groupId: isActuallyGroupChat ? chatId : null,
        recipientId: recipientId
      });
      this.emitTypingTimeout = null;
    }, 2000);
  }

  toggleEmojiPicker() {
    this.showEmojiPicker.set(!this.showEmojiPicker());
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.showEmojiPicker()) {
      this.showEmojiPicker.set(false);
    }
  }

  toggleChatList() {
    this.showChatList.update(v => !v);
  }

  addEmoji(emoji: string) {
    this.newMessageText.update(text => text + emoji);
    // don't close the picker automatically so they can add multiple emojis
  }

  scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('chat-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  // --- File Upload ---

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.mediaService.uploadMedia(file).subscribe({
        next: (res) => {
          const url = res.data.media.url;
          this.socketService.sendMessage({
            type: 'text',
            content: `![Image](${url})`,
            conversationId: this.activeChatId()!,
            groupId: this.activeChat()?.isGroupChat ? this.activeChatId()! : null,
            recipientId: this.activeChat()?.isGroupChat ? null : this.activeChat()?.participants.find((p: any) => p && p._id !== this.myUser()?._id)?._id,
            iv: 'dummy_iv_for_now',
            encryptedKeys: []
          }, (res) => {
            if (res && res.success && res.message) {
              this.handleIncomingMessage(res.message);
              this.scrollToBottom();
            }
          });
        },
        error: (err) => console.error('Upload failed', err)
      });
    }
  }

  // --- Rendering Markdown Image Hack ---

  isImageMessage(content: string): boolean {
    return content.startsWith('![Image](') && content.endsWith(')');
  }

  extractImageUrl(content: string): string {
    const match = content.match(/!\[Image\]\((.*?)\)/);
    return match ? match[1] : '';
  }

  getMessagePreview(content: string): string {
    if (!content) return 'No messages yet';
    if (content.startsWith('![Image](')) return '📷 Photo';
    if (content.startsWith('![Video](')) return '🎥 Video';
    if (content.startsWith('![Audio](')) return '🎵 Audio';
    if (content.startsWith('![File](')) return '📄 File';
    return content;
  }

  voiceNoteComingSoon() {
    this.toastService.info('Voice notes are coming in a future update! 🚀');
  }

  handleIncomingMessage(msg: any) {
    const senderId = msg.sender?._id || msg.sender;
    const chatId = msg.conversationId || msg.conversation || msg.group;
    
    if (senderId && senderId !== this.myUser()?._id) {
      this.soundService.playMessageSound();
      this.hapticService.vibrateMessage();
      
      // Only show desktop alert if we are not actively viewing this chat
      if (this.activeChatId() !== chatId || document.hidden) {
        const senderName = msg.sender?.displayName || msg.sender?.username || 'Someone';
        const text = msg.content || msg.text || (msg.mediaUrl ? 'Sent media' : 'Sent a message');
        this.notificationService.notifyNewMessage(senderName, text, chatId);
      }
    }
    this.chats.update(chats => {
      const chatIndex = chats.findIndex(c => c._id === chatId || c.id === chatId);
      if (chatIndex > -1) {
        const updatedChat = { ...chats[chatIndex], messages: [...chats[chatIndex].messages, msg] };
        
        // If not active chat, increment unread count
        if (this.activeChatId() !== chatId) {
          updatedChat.unreadCount = (updatedChat.unreadCount || 0) + 1;
        }

        const newChats = [...chats];
        newChats.splice(chatIndex, 1);
        newChats.unshift(updatedChat);
        if (this.activeChatId() === chatId) {
          setTimeout(() => {
            this.checkSmartReplies();
            // Mark as read if setting is enabled
            if (this.myUser()?.settings?.privacy?.readReceipts !== false) {
              const recipientId = updatedChat.isGroupChat ? null : updatedChat.participants.find((p: any) => p && p._id !== this.myUser()?._id)?._id;
              this.socketService.markAsRead(chatId, recipientId);
            }
          }, 100);
        }
        return newChats;
      } else {
        this.loadChats();
        return chats;
      }
    });
  }

  handleMessagesRead(data: any) {
    const { conversationId, readByUserId, readAt } = data;
    this.chats.update(chats => {
      const chatIndex = chats.findIndex(c => c._id === conversationId || c.id === conversationId);
      if (chatIndex > -1) {
        const chat = chats[chatIndex];
        const updatedMessages = chat.messages.map(m => {
          if (m.sender !== readByUserId && m.sender?._id !== readByUserId) {
            // Update the message's readBy array if it doesn't already include the user
            const hasRead = (m as any).readBy?.some((r: any) => r?.user === readByUserId || r === readByUserId);
            if (!hasRead) {
              return {
                ...m,
                readBy: [...((m as any).readBy || []), { user: readByUserId, readAt }]
              };
            }
          }
          return m;
        });
        
        const newChats = [...chats];
        newChats[chatIndex] = { ...chat, messages: updatedMessages };
        return newChats;
      }
      return chats;
    });
  }

  deleteMessage(msgId: string | undefined) {
    if (!msgId || !this.activeChatId()) return;
    
    // Optimistic UI deletion
    this.chats.update(chats => {
      const chatIndex = chats.findIndex(c => c._id === this.activeChatId() || c.id === this.activeChatId());
      if (chatIndex > -1) {
        const updatedChat = {
          ...chats[chatIndex],
          messages: chats[chatIndex].messages.filter(m => m._id !== msgId && m.id !== msgId)
        };
        const newChats = [...chats];
        newChats[chatIndex] = updatedChat;
        return newChats;
      }
      return chats;
    });

    // Call API via socket for permanent DB deletion across all clients
    this.socketService.deleteMessage({
      messageId: msgId,
      conversationId: this.activeChatId(),
      groupId: this.activeChat()?.isGroupChat ? this.activeChatId() : null,
      recipientId: this.activeChat()?.isGroupChat ? null : this.activeChat()?.participants?.find((p: any) => p && p._id !== this.myUser()?._id)?._id
    }, (res) => {
      if (res && res.error) {
        console.error('Failed to delete message:', res.error);
      }
    });
  }

  checkSmartReplies() {
    const isPremium = this.myUser()?.isPremium === true || this.myUser()?.premiumPlan === 'monthly' || this.myUser()?.premiumPlan === 'yearly';
    if (!isPremium) {
      this.smartReplies.set(['✨ Unlock AI Assistant (Premium)']);
      return;
    }

    const aiEnabled = this.myUser()?.settings?.aiSmartReplies !== false;
    if (!aiEnabled) {
      this.smartReplies.set([]);
      return;
    }

    const chat = this.activeChat();
    if (!chat || chat.messages.length === 0) {
      this.smartReplies.set([]);
      return;
    }

    const lastMessage = chat.messages[chat.messages.length - 1];
    
    // If the last message is from me, don't generate replies
    if (lastMessage.sender?._id === this.myUser()?._id || lastMessage.sender === this.myUser()?._id) {
      this.smartReplies.set([]);
      return;
    }

    const context = chat.messages.slice(-5).map(m => ({
      role: (m.sender?._id === this.myUser()?._id || m.sender === this.myUser()?._id) ? 'user' : 'other',
      content: m.content
    }));

    this.aiLoading.set(true);
    this.chatService.getSmartReplies(context).subscribe({
      next: (res) => {
        this.smartReplies.set(res.data.replies || []);
        this.aiLoading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to get smart replies', err);
        this.aiLoading.set(false);
        if (err.status === 429) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('aiLimitReached', 'true');
          }
        }
      }
    });
  }

  useSmartReply(reply: string) {
    if (reply === '✨ Unlock AI Assistant (Premium)') {
      this.router.navigate(['/premium']);
      return;
    }

    if (this.newMessageText().trim()) {
      this.newMessageText.update(v => v + ' ' + reply);
    } else {
      this.newMessageText.set(reply);
    }
    this.smartReplies.set([]); // Hide replies after using one
  }

  // --- Calling Logic ---

  initiateCall(type: 'audio' | 'video') {
    const chat = this.activeChat();
    if (!chat || chat.isGroupChat) {
      this.toastService.warning('Calls in group chats are not supported yet');
      return;
    }
    const targetUser = chat.participants.find((p: any) => p && p._id !== this.myUser()?._id);
    if (!targetUser) return;
    
    this.callService.startCall(targetUser._id, targetUser, type);
  }

  // --- Contact Request Logic ---

  openAddContact() {
    this.showAddContactModal.set(true);
  }

  closeAddContact() {
    this.showAddContactModal.set(false);
    this.newContactUsername.set('');
  }

  sendRequest() {
    const username = this.newContactUsername().trim().replace('@', '');
    if (!username) return;

    this.userService.sendContactRequest(username).subscribe({
      next: () => {
        this.toastService.success('Contact request sent successfully!');
        this.closeAddContact();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to send request');
      }
    });
  }

  loadPendingRequests() {
    this.userService.getPendingRequests().subscribe({
      next: (res) => {
        res.data.requests.forEach((req: any) => {
          this.presenceService.initializeStatus(req._id || req.id, req.status === 'online', req.lastSeen);
        });
        this.pendingRequests.set(res.data.requests);
      }
    });
  }

  openRequests() {
    this.showRequestsModal.set(true);
    this.loadPendingRequests();
  }

  closeRequests() {
    this.showRequestsModal.set(false);
  }

  acceptRequest(senderId: string) {
    this.userService.acceptRequest(senderId).subscribe({
      next: () => {
        this.loadPendingRequests();
        this.loadChats(); // Refresh chats to show the new one
        if (this.pendingRequests().length === 0) {
          this.closeRequests();
        }
      },
      error: (err) => console.error(err)
    });
  }

  rejectRequest(senderId: string) {
    this.userService.rejectRequest(senderId).subscribe({
      next: () => {
        this.loadPendingRequests();
        if (this.pendingRequests().length === 0) {
          this.closeRequests();
        }
      },
      error: (err) => console.error(err)
    });
  }

  goToSettings() {
    this.router.navigate(['/profile']);
  }

  // --- User Profile & Blocking Logic ---
  
  openUserProfile() {
    const chat = this.activeChat();
    if (!chat) return;

    // For group chats with more than 2 people, we don't support a single profile view yet
    if (chat.isGroupChat && chat.participants.length > 2) {
      this.toastService.info('Group profile view coming soon');
      return;
    }

    const targetUser = chat.participants.find((p: any) => p && p._id !== this.myUser()?._id);
    if (!targetUser) {
      this.toastService.error('Could not identify the other user');
      return;
    }

    const username = targetUser.username || (targetUser.handle ? targetUser.handle.replace('@', '') : null);
    
    if (username) {
      this.userService.getUserProfileByUsername(username).subscribe({
        next: (res) => {
          const user = res.data.user;
          this.presenceService.initializeStatus(user._id, user.status === 'online', user.lastSeen);
          this.selectedUserProfile.set(user);
          this.showUserProfile.set(true);
        },
        error: () => {
          this.toastService.error('Could not load user profile');
        }
      });
    } else {
       this.presenceService.initializeStatus(targetUser._id || targetUser.id, targetUser.status === 'online', targetUser.lastSeen);
       this.selectedUserProfile.set(targetUser);
       this.showUserProfile.set(true);
    }
  }

  closeUserProfile() {
    this.showUserProfile.set(false);
    this.selectedUserProfile.set(null);
  }

  isUserBlocked() {
    const user = this.selectedUserProfile();
    if (!user || !this.myUser()) return false;
    return (this.myUser()?.blockedUsers || []).includes(user._id);
  }

  blockUser() {
    const user = this.selectedUserProfile();
    if (!user) return;
    
    if (confirm(`Are you sure you want to block ${user.displayName || user.username}? They won't be able to message you.`)) {
       this.userService.blockUser(user._id).subscribe({
         next: () => {
           this.toastService.success('User blocked successfully');
           if (this.myUser()) {
             this.myUser.update((u: any) => ({
               ...u,
               blockedUsers: [...(u.blockedUsers || []), user._id]
             }));
           }
         },
         error: (err) => {
           this.toastService.error(err.error?.message || 'Failed to block user');
         }
       });
    }
  }

  unblockUser() {
    const user = this.selectedUserProfile();
    if (!user) return;
    
    this.userService.unblockUser(user._id).subscribe({
      next: () => {
        this.toastService.success('User unblocked');
        if (this.myUser()) {
          this.myUser.update((u: any) => ({
            ...u,
            blockedUsers: (u.blockedUsers || []).filter((id: string) => id !== user._id)
          }));
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to unblock user');
      }
    });
  }

  // --- Auto Delete Logic ---
  handleNeverDeleteClick(event: Event) {
    event.stopPropagation();
    if (!this.myUser()?.isPremium && !this.myUser()?.isAdmin) {
      this.router.navigate(['/premium']);
      this.showAutoDeleteMenu.set(false);
      return;
    }
    this.setAutoDeleteSetting('off');
  }

  toggleAutoDeleteMenu() {
    this.showAutoDeleteMenu.update(v => !v);
  }

  setAutoDeleteSetting(setting: 'midnight' | 'after_view' | 'off') {
    const chatId = this.activeChatId();
    if (!chatId) return;

    this.autoDeleteSettings.update(settings => {
      const newSettings = { ...settings, [chatId]: setting };
      localStorage.setItem('autoDeleteSettings', JSON.stringify(newSettings));
      return newSettings;
    });
    this.showAutoDeleteMenu.set(false);
    this.toastService.success(`Auto-delete set to ${setting.replace('_', ' ')}`);
  }

  getAutoDeleteSetting(chatId: string | null | undefined): 'midnight' | 'after_view' | 'off' {
    const isPremiumOrAdmin = this.myUser()?.isPremium || this.myUser()?.isAdmin;
    const defaultSetting = isPremiumOrAdmin ? 'off' : 'midnight';
    if (!chatId) return defaultSetting;
    
    const savedSetting = this.autoDeleteSettings()[chatId];
    if (savedSetting === 'off' && !isPremiumOrAdmin) {
      return 'midnight'; // Force downgrade if they lose premium
    }
    return savedSetting || defaultSetting;
  }

  checkAutoDeleteOnLoad(chatId: string) {
    const setting = this.getAutoDeleteSetting(chatId);
    if (setting === 'midnight') {
      const lastClearedStr = localStorage.getItem(`lastCleared_${chatId}`);
      const now = new Date();
      // IST is UTC+5:30
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const todayDateString = istNow.toISOString().split('T')[0];
      
      if (lastClearedStr !== todayDateString) {
        this.chatService.clearChat(chatId).subscribe({
          next: () => {
            localStorage.setItem(`lastCleared_${chatId}`, todayDateString);
            this.chats.update(chats => chats.map(c => c._id === chatId || c.id === chatId ? { ...c, messages: [], lastMessage: null } : c));
          },
          error: (err) => console.error('Failed to clear chat on load', err)
        });
      }
    }
  }

  checkAutoDeleteOnLeave(chatId: string) {
    const setting = this.getAutoDeleteSetting(chatId);
    if (setting === 'after_view') {
      this.chatService.clearChat(chatId).subscribe({
        next: () => {
          this.chats.update(chats => chats.map(c => c._id === chatId || c.id === chatId ? { ...c, messages: [], lastMessage: null } : c));
        },
        error: (err) => console.error('Failed to clear chat on leave', err)
      });
    }
  }

  // --- Chat Lock Logic ---

  toggleLockCurrentChat() {
    const chatId = this.activeChatId();
    if (!chatId) return;
    
    this.chatService.toggleChatLock(chatId).subscribe({
      next: (res) => {
        const isLocked = res.data.isLocked;
        this.toastService.success(`Chat ${isLocked ? 'locked' : 'unlocked'}`);
        // Update chat list
        this.chats.update(chats => chats.map(c => (c._id === chatId || c.id === chatId) ? { ...c, isLocked } as any : c));
        
        if (isLocked) {
          // Keep it unlocked for this session so user doesn't immediately get locked out while viewing it
          this.unlockedSessionChats.update(set => {
            const newSet = new Set(set);
            newSet.add(chatId);
            return newSet;
          });
        } else {
          this.unlockedSessionChats.update(set => {
            const newSet = new Set(set);
            newSet.delete(chatId);
            return newSet;
          });
        }
      },
      error: (err) => {
        if (err.error?.message?.includes('Chat Lock PIN')) {
          this.showSetPinModal.set(true);
        } else {
          this.toastService.error('Failed to toggle lock');
        }
      }
    });
  }

  setupPin() {
    if (this.pinInput().length < 4) {
      this.pinError.set('PIN must be at least 4 characters');
      return;
    }
    this.userService.setupChatLockPin(this.pinInput()).subscribe({
      next: () => {
        this.toastService.success('PIN set successfully');
        this.showSetPinModal.set(false);
        this.pinInput.set('');
        this.pinError.set('');
        this.toggleLockCurrentChat(); // Try locking again
      },
      error: () => this.pinError.set('Failed to set PIN')
    });
  }

  verifyPin() {
    this.userService.verifyChatLockPin(this.pinInput()).subscribe({
      next: () => {
        const targetId = this.chatToUnlock();
        if (targetId) {
          this.unlockedSessionChats.update(set => {
            const newSet = new Set(set);
            newSet.add(targetId);
            return newSet;
          });
          this.closePinModals();
          
          if (this.activeChatId()) {
            this.socketService.leaveChat(this.activeChatId()!);
          }
          this.activeChatId.set(targetId);
          this.showChatList.set(false);
          this.socketService.joinChat(targetId);
          this.loadMessagesForSelectedChat(targetId);
        }
      },
      error: () => this.pinError.set('Incorrect PIN')
    });
  }

  closePinModals() {
    this.showSetPinModal.set(false);
    this.showUnlockModal.set(false);
    this.pinInput.set('');
    this.pinError.set('');
    this.chatToUnlock.set(null);
  }
}
