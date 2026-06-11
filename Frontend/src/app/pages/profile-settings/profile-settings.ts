import { Component, OnInit, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { SettingsService } from '../../services/settings.service';
import { NotificationService } from '../../services/notification.service';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { MediaService } from '../../services/media.service';
import { ToastService } from '../../services/toast.service';
import { SocketService } from '../../services/socket.service';
import { PremiumService } from '../../services/premium.service';

@Component({
  selector: 'app-profile-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-settings.html',
  styleUrl: './profile-settings.css',
})
export class ProfileSettings implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private mediaService = inject(MediaService);
  private titleService = inject(Title);
  private settingsService = inject(SettingsService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private socketService = inject(SocketService);
  private premiumService = inject(PremiumService);

  settings = {

    twoStep: signal(true),
    aiSmartReplies: signal(true),
    hapticFeedback: signal(true),
    readReceipts: signal(true),
    desktopAlerts: signal(true),
    hideActiveStatus: signal(false)
  };

  profile = {
    name: signal(''),
    username: signal(''),
    avatar: signal(''),
    bio: signal(''),
    isPremium: signal(false),
    isAdmin: signal(false),
    premiumPlan: signal('none')
  };

  isEditing = signal(false);
  isLoading = signal(false);
  editForm = {
    name: signal(''),
    username: signal(''),
    avatar: signal(''),
    bio: signal('')
  };

  usernameCheckSubject = new Subject<string>();
  isCheckingUsername = signal(false);
  usernameAvailable = signal<boolean | null>(null);

  // Who can add me cycling removed

  // Message tone cycling
  messageToneOptions = ['Default (Pop)', 'Subtle Chime', 'Ping', 'Bell', 'WhatsApp Style', 'Silent'];
  messageToneIndex = signal(0);
  messageTone = signal('Default (Pop)');

  // Manage 2FA modal
  showManageModal = signal(false);
  showE2eModal = signal(false);
  showAboutModal = signal(false);

  // Active Sessions expand
  showSessions = signal(false);
  sessions = [
    { device: 'MacBook Pro — Chrome', location: 'San Francisco, US', lastActive: 'Now' },
    { device: 'iPhone 15 — CipherChat App', location: 'San Francisco, US', lastActive: '2 hours ago' },
    { device: 'Windows PC — Edge', location: 'New York, US', lastActive: 'Yesterday' }
  ];

  // Logout confirmation
  showLogoutConfirm = signal(false);

  // Delete Account confirmation
  showDeleteAccountModal = signal(false);
  deleteConfirmInput = signal('');

  // AI config feedback
  showAiConfigToast = signal(false);
  
  aiLimitReached = signal(false);

  isAiLocked() {
    return this.aiLimitReached() || !this.profile.isPremium();
  }

  // Change Chat Lock PIN
  showChangePinModal = signal(false);
  oldPinInput = signal('');
  newPinInput = signal('');
  pinError = signal('');

  // Payment History
  paymentHistory = signal<any[]>([]);

  getAvatarUrl(url: string | undefined): string {
    return this.userService.getAvatarUrl(url);
  }



  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.usernameCheckSubject.pipe(
        debounceTime(500),
        distinctUntilChanged()
      ).subscribe(username => {
        if (!username || username.length < 3) {
          this.usernameAvailable.set(null);
          this.isCheckingUsername.set(false);
          return;
        }
        
        // If it's their own username, it's valid
        if (username.toLowerCase() === this.profile.username().toLowerCase()) {
          this.usernameAvailable.set(true);
          this.isCheckingUsername.set(false);
          return;
        }

        this.isCheckingUsername.set(true);
        this.authService.checkUsername(username.toLowerCase()).subscribe({
          next: (res) => {
            this.usernameAvailable.set(res.data.isAvailable);
            this.isCheckingUsername.set(false);
          },
          error: () => {
            this.isCheckingUsername.set(false);
            this.usernameAvailable.set(null);
          }
        });
      });

      this.userService.currentUser$.subscribe(user => {
        if (user) {
          this.profile.name.set(user.displayName || user.username || 'User');
          this.profile.username.set(user.username || '');
          this.profile.avatar.set(user.avatar || '');
          this.profile.bio.set(user.bio || '');
          this.profile.isPremium.set(user.isPremium === true);
          this.profile.isAdmin.set(user.isAdmin === true);
          this.profile.premiumPlan.set(user.premiumPlan || 'none');
          
          this.editForm.name.set(this.profile.name());
          this.editForm.username.set(this.profile.username());
          this.editForm.avatar.set(this.profile.avatar());
          this.editForm.bio.set(this.profile.bio());
          
          // Load settings if available
          if (user.settings) {
            if (user.settings.privacy) {
              this.settings.readReceipts.set(user.settings.privacy.readReceipts !== false);

              this.settings.hideActiveStatus.set(user.settings.privacy.hideActiveStatus === true);
            }
            if (user.settings.security) {
              this.settings.twoStep.set(user.settings.security.twoStepVerification === true);
            }
            if (user.settings.ai) {
              this.settings.aiSmartReplies.set(user.settings.ai.smartReplies !== false);
            }
            if (user.settings.notifications) {
              this.settings.hapticFeedback.set(user.settings.notifications.hapticFeedback !== false);
              this.settings.desktopAlerts.set(user.settings.notifications.desktopAlerts !== false);
              if (user.settings.notifications.messageTone) {
                this.messageTone.set(user.settings.notifications.messageTone);
                this.messageToneIndex.set(this.messageToneOptions.indexOf(user.settings.notifications.messageTone));
              }
            }
          }
          
          if (user.trustedDevices && user.trustedDevices.length > 0) {
            this.sessions = user.trustedDevices.map((d: any) => ({
              device: d.deviceName || 'Unknown Device',
              location: 'Unknown Location', // We don't track location yet
              lastActive: new Date(d.lastActive).toLocaleString()
            }));
          } else {
            // Default real session if trustedDevices is empty
            this.sessions = [{ device: 'Current Session', location: 'Unknown Location', lastActive: 'Now' }];
          }
          
          if (localStorage.getItem('aiLimitReached') === 'true') {
            this.aiLimitReached.set(true);
            this.settings.aiSmartReplies.set(false);
          }
        }
      });
      
      // Make sure we have fresh profile data
      this.userService.getProfile().subscribe();

      // Load Payment History
      this.premiumService.getPaymentHistory().subscribe({
        next: (res) => {
          if (res.data?.payments) {
            this.paymentHistory.set(res.data.payments);
          }
        },
        error: (err) => console.error('Failed to load payment history', err)
      });
      
    }
  }

  toggle(setting: keyof typeof this.settings) {
    if (setting === 'aiSmartReplies' && this.isAiLocked()) {
      this.toastService.warning('Premium Required to use AI features.', 5000);
      return;
    }

    const newValue = !this.settings[setting]();
    if (setting === 'desktopAlerts' && newValue) {
      this.notificationService.requestPermission();
    }

    this.settings[setting].update(v => !v);
    this.updateSettings();
  }

  updateSettings() {
    this.settingsService.updateSettings({
      hapticFeedback: this.settings.hapticFeedback(),
      desktopAlerts: this.settings.desktopAlerts(),
      messageTone: this.messageTone()
    });

    this.userService.updateSettings({
      privacy: {
        readReceipts: this.settings.readReceipts(),

        hideActiveStatus: this.settings.hideActiveStatus()
      },
      notifications: {
        hapticFeedback: this.settings.hapticFeedback(),
        desktopAlerts: this.settings.desktopAlerts(),
        messageTone: this.messageTone()
      },
      security: {
        twoStepVerification: this.settings.twoStep()
      },
      ai: {
        smartReplies: this.settings.aiSmartReplies()
      }
    }).subscribe({
      next: () => {
        this.socketService.updatePresenceSettings(this.settings.hideActiveStatus());
      }
    });
  }

  toggleEdit() {
    if (!this.isEditing()) {
      this.editForm.name.set(this.profile.name());
      this.editForm.username.set(this.profile.username());
      this.editForm.avatar.set(this.profile.avatar());
      this.editForm.bio.set(this.profile.bio());
      this.usernameAvailable.set(null);
    }
    this.isEditing.update(v => !v);
  }

  saveProfile() {
    const newUsername = this.editForm.username()?.trim().toLowerCase();
    
    if (!newUsername || newUsername.length < 3) {
      this.toastService.error('Username must be at least 3 characters long.');
      return;
    }
    
    if (this.usernameAvailable() === false) {
      this.toastService.error('Cannot save: Username is already taken.');
      return;
    }

    this.isLoading.set(true);
    this.userService.updateProfile({
      displayName: this.editForm.name(),
      username: newUsername,
      avatar: this.editForm.avatar(),
      bio: this.editForm.bio()
    }).subscribe({
      next: (res) => {
        const user = res.data.user;
        this.profile.name.set(user.displayName || '');
        this.profile.username.set(user.username || '');
        this.profile.avatar.set(user.avatar || '');
        this.isEditing.set(false);
        this.isLoading.set(false);
        this.toastService.success('Profile updated successfully!');
      },
      error: (err) => {
        console.error('Failed to update profile', err);
        this.isLoading.set(false);
        this.toastService.error('Failed to update profile. Please try again.');
      }
    });
  }

  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isLoading.set(true);
      this.mediaService.uploadMedia(file).subscribe({
        next: (res) => {
          if (res.data?.media?.url) {
            this.editForm.avatar.set(res.data.media.url);
            // Auto save profile when avatar is uploaded
            this.userService.updateProfile({
              avatar: res.data.media.url
            }).subscribe({
              next: (profileRes) => {
                const user = profileRes.data.user;
                this.profile.avatar.set(user.avatar || '');
                this.toastService.success('Profile picture updated!');
                this.isLoading.set(false);
              },
              error: () => {
                this.toastService.error('Failed to save profile picture.');
                this.isLoading.set(false);
              }
            });
          }
        },
        error: (err) => {
          console.error('Avatar upload failed', err);
          this.toastService.error('Failed to upload avatar.');
          this.isLoading.set(false);
        }
      });
    }
  }

  onUsernameChange(val: string) {
    this.editForm.username.set(val);
    this.usernameCheckSubject.next(val);
  }

  cycleMessageTone() {
    this.messageToneIndex.update(i => (i + 1) % this.messageToneOptions.length);
    this.messageTone.set(this.messageToneOptions[this.messageToneIndex()]);
    this.updateSettings(); // Save message tone when cycled
  }

  openManageModal() {
    this.showManageModal.set(true);
  }

  closeManageModal() {
    this.showManageModal.set(false);
  }

  openE2eModal() {
    this.showE2eModal.set(true);
  }

  closeE2eModal() {
    this.showE2eModal.set(false);
  }

  openAboutModal() {
    this.showAboutModal.set(true);
  }

  closeAboutModal() {
    this.showAboutModal.set(false);
  }

  goToPremium() {
    this.router.navigate(['/premium']);
  }

  toggleSessions() {
    this.showSessions.update(v => !v);
  }

  confirmLogout() {
    this.showLogoutConfirm.set(true);
  }

  cancelLogout() {
    this.showLogoutConfirm.set(false);
  }

  doLogout() {
    this.showLogoutConfirm.set(false);
    this.authService.logout();
    this.router.navigate(['/']);
  }

  openDeleteAccountModal() {
    this.showDeleteAccountModal.set(true);
    this.deleteConfirmInput.set('');
  }

  closeDeleteAccountModal() {
    this.showDeleteAccountModal.set(false);
    this.deleteConfirmInput.set('');
  }

  doDeleteAccount() {
    if (this.deleteConfirmInput() !== 'DELETE') return;
    
    this.isLoading.set(true);
    this.userService.deleteAccount().subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeDeleteAccountModal();
        this.authService.logout();
        this.router.navigate(['/']);
        this.toastService.success('Your account has been permanently deleted.');
      },
      error: (err) => {
        console.error('Failed to delete account', err);
        this.isLoading.set(false);
        this.toastService.error('Failed to delete account. Please try again.');
      }
    });
  }

  openAiConfig() {
    if (this.isAiLocked()) {
      this.toastService.warning('Premium Required. Please purchase Premium to configure AI features.', 5000);
      return;
    }
    this.showAiConfigToast.set(true);
    setTimeout(() => this.showAiConfigToast.set(false), 3000);
  }

  // --- Chat Lock PIN ---
  openChangePinModal() {
    this.showChangePinModal.set(true);
  }

  closeChangePinModal() {
    this.showChangePinModal.set(false);
    this.oldPinInput.set('');
    this.newPinInput.set('');
    this.pinError.set('');
  }

  saveNewPin() {
    if (this.newPinInput().length < 4) {
      this.pinError.set('New PIN must be at least 4 characters');
      return;
    }
    
    this.userService.setupChatLockPin(this.newPinInput(), this.oldPinInput()).subscribe({
      next: () => {
        this.toastService.success('Chat Lock PIN updated successfully');
        this.closeChangePinModal();
      },
      error: (err) => {
        this.pinError.set(err.error?.message || 'Failed to update PIN');
      }
    });
  }


}
