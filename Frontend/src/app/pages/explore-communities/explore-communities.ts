import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';
import { PresenceService } from '../../services/presence.service';
import { ToastService } from '../../services/toast.service';
import { MediaService } from '../../services/media.service';

export interface Community {
  id: string;
  name: string;
  members: number;
  description: string;
  category?: string;
  icon?: string;
  color?: string;
  joined: boolean;
  isPending?: boolean;
  avatar?: string;
}

@Component({
  selector: 'app-explore-communities',
  imports: [CommonModule, FormsModule],
  templateUrl: './explore-communities.html',
  styleUrl: './explore-communities.css',
})
export class ExploreCommunities implements OnInit {
  private groupService = inject(GroupService);
  private router = inject(Router);
  private userService = inject(UserService);
  presenceService = inject(PresenceService);
  private toastService = inject(ToastService);
  private mediaService = inject(MediaService);
  
  myUser = signal<any>(null);

  categories = ['All Topics', 'Tech', 'Design', 'Gaming', 'Music', 'Science', 'Fitness'];
  activeCategory = signal<string>('All Topics');
  searchQuery = signal<string>('');
  featuredJoined = signal(false);

  showFilterMenu = signal(false);
  activeSort = signal<string>('popular');

  communities = signal<Community[]>([]);

  // Create Modal State
  showCreateModal = signal(false);
  featuredCommunity = computed(() => {
    const list = this.communities();
    const official = list.find(c => c.name.toLowerCase().includes('cipherchat'));
    if (official) return official;
    
    return {
      id: 'mock-official',
      name: 'CipherChat Community',
      description: 'Get the latest app updates, new features, announcements, and important news here. Stay connected and never miss what’s new.',
      members: list.reduce((sum, c) => sum + c.members, 0) || 12400,
      category: 'Official',
      joined: false,
      isPending: false,
      avatar: ''
    } as Community;
  });
  newGroup = {
    name: '',
    description: '',
    type: 'community',
    category: 'Tech',
    approvalRequired: false,
    onlyAdminsCanMessage: false
  };

  // --- Manage Community State ---
  myCommunities = signal<any[]>([]);
  showManageCommunityModal = signal(false);
  selectedCommunity = signal<any>(null);
  communityEditForm = {
    name: signal(''),
    avatar: signal('')
  };

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.userService.currentUser$.subscribe(user => {
        if (user) {
          this.myUser.set(user);
        }
      });
      this.userService.getProfile().subscribe();
      this.loadGroups();
      this.loadMyCommunities();
    }
  }

  loadMyCommunities() {
    this.groupService.getMyGroups().subscribe({
      next: (res) => {
        const myUserId = this.myUser()?._id || this.myUser()?.id;
        
        // Filter to only include communities created by the user
        const myCreatedGroups = res.data.groups.filter((g: any) => {
          const creatorId = g.creator?._id || g.creator?.id || g.creator;
          return creatorId === myUserId;
        });

        // Initialize presence for community members
        myCreatedGroups.forEach((g: any) => {
          g.members?.forEach((m: any) => {
            if (m.user && m.user._id && m.user._id !== myUserId) {
              this.presenceService.initializeStatus(m.user._id, m.user.status === 'online', m.user.lastSeen);
            }
          });
        });
        
        this.myCommunities.set(myCreatedGroups);
      },
      error: (err) => console.error('Failed to load my communities', err)
    });
  }

  getAvatarUrl(url: string | undefined): string {
    return this.userService.getAvatarUrl(url);
  }

  loadGroups() {
    this.groupService.exploreGroups().subscribe({
      next: (res) => {
        const mapped = res.data.groups.map((g: any) => {
          let desc = g.description;
          if (!desc || desc === 'A community on CipherChat') {
            desc = 'Join the conversation and connect with like-minded individuals. Share your passions, spark new ideas, and build meaningful relationships in this vibrant space.';
          }
          if (g.name.toLowerCase().includes('cipherchat')) {
             desc = 'Get the latest app updates, new features, announcements, and important news here. Stay connected and never miss what’s new.';
          }
          return {
            id: g._id,
            name: g.name,
            description: desc,
            members: g.memberCount || 1,
            category: g.settings?.category || 'Tech',
            joined: g.isJoined || false,
            isPending: g.isPending || false,
            avatar: g.avatar
          };
        });
        this.communities.set(mapped);
      },
      error: (err) => console.error('Failed to load groups', err)
    });
  }

  filteredCommunities = computed(() => {
    let list = this.communities();
    if (this.activeCategory() !== 'All Topics') {
      list = list.filter(c => c.category === this.activeCategory());
    }
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    
    // Sorting
    const sort = this.activeSort();
    if (sort === 'popular') {
      list.sort((a, b) => b.members - a.members);
    } else if (sort === 'a-z') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'z-a') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    }

    return list;
  });

  toggleFilterMenu() {
    this.showFilterMenu.update(v => !v);
  }

  setSort(sortType: string) {
    this.activeSort.set(sortType);
    this.showFilterMenu.set(false);
  }

  setCategory(cat: string) {
    this.activeCategory.set(cat);
  }

  scrollToDiscovery() {
    const el = document.getElementById('discovery-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  joinFeatured() {
    const featured = this.featuredCommunity();
    if (featured.id === 'mock-official') {
      this.toastService.info('The official CipherChat community has not been created by the admins yet.');
      return;
    }
    
    // If it's already joined, do nothing or show a toast
    if (featured.joined) {
      this.toastService.info('You are already a member of this community');
      return;
    }
    
    this.joinCommunity(featured.id);
  }

  joinCommunity(groupId: string) {
    this.groupService.joinGroup(groupId).subscribe({
      next: (res) => {
        // Find and update the local state to show 'joined' or 'pending' without full reload
        const index = this.communities().findIndex(c => c.id === groupId);
        if (index !== -1) {
          const updated = [...this.communities()];
          if (res.message && res.message.includes('pending')) {
            updated[index] = { ...updated[index], isPending: true };
          } else {
            updated[index] = { ...updated[index], joined: true, members: updated[index].members + 1 };
          }
          this.communities.set(updated);
        }
      },
      error: (err) => console.error('Failed to join community', err)
    });
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.newGroup = { name: '', description: '', type: 'community', category: 'Tech', approvalRequired: false, onlyAdminsCanMessage: false };
  }

  createGroup() {
    if (!this.newGroup.name) return;
    const payload = {
      name: this.newGroup.name,
      description: this.newGroup.description,
      type: this.newGroup.type,
      settings: {
        category: this.newGroup.category,
        approvalRequired: this.newGroup.approvalRequired,
        onlyAdminsCanMessage: this.newGroup.onlyAdminsCanMessage
      }
    };
    this.groupService.createGroup(payload).subscribe({
      next: () => {
        this.loadGroups();
        this.loadMyCommunities();
        this.closeCreateModal();
      },
      error: (err) => console.error('Failed to create group', err)
    });
  }

  // --- Manage Community Methods ---
  openManageCommunity(community: any) {
    this.selectedCommunity.set(community);
    this.communityEditForm.name.set(community.name);
    this.communityEditForm.avatar.set(community.avatar || '');
    this.showManageCommunityModal.set(true);
  }

  closeManageCommunity() {
    this.showManageCommunityModal.set(false);
    this.selectedCommunity.set(null);
  }

  onCommunityAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.mediaService.uploadMedia(file).subscribe({
        next: (res) => {
          if (res.data?.media?.url) {
            this.communityEditForm.avatar.set(res.data.media.url);
          }
        },
        error: (err) => {
          console.error('Community avatar upload failed', err);
          this.toastService.error('Failed to upload avatar.');
        }
      });
    }
  }

  saveCommunityChanges() {
    const comm = this.selectedCommunity();
    if (!comm) return;

    this.groupService.updateGroup(comm._id, {
      name: this.communityEditForm.name(),
      avatar: this.communityEditForm.avatar()
    }).subscribe({
      next: () => {
        this.toastService.success('Community updated successfully');
        this.loadMyCommunities();
        this.closeManageCommunity();
      },
      error: (err) => {
        this.toastService.error('Failed to update community');
        console.error(err);
      }
    });
  }

  removeCommunityMember(userId: string) {
    const comm = this.selectedCommunity();
    if (!comm) return;

    if (confirm('Are you sure you want to remove this member?')) {
      this.groupService.removeMember(comm._id, userId).subscribe({
        next: (res: any) => {
          this.toastService.success('Member removed');
          this.selectedCommunity.update(curr => {
            if (!curr) return null;
            return { ...curr, members: curr.members.filter((m: any) => m.user?._id !== userId) };
          });
          this.loadMyCommunities();
        },
        error: (err) => {
          this.toastService.error('Failed to remove member');
          console.error(err);
        }
      });
    }
  }

  acceptCommunityRequest(userId: string) {
    const comm = this.selectedCommunity();
    if (!comm) return;

    this.groupService.acceptJoinRequest(comm._id, userId).subscribe({
      next: (res) => {
        this.toastService.success('Request accepted');
        comm.pendingRequests = comm.pendingRequests.filter((r: any) => r.user._id !== userId);
        this.selectedCommunity.set({ ...comm });
        this.loadMyCommunities();
      },
      error: (err) => {
        this.toastService.error('Failed to accept request');
        console.error(err);
      }
    });
  }

  rejectCommunityRequest(userId: string) {
    const comm = this.selectedCommunity();
    if (!comm) return;

    this.groupService.rejectJoinRequest(comm._id, userId).subscribe({
      next: () => {
        this.toastService.success('Request rejected');
        comm.pendingRequests = comm.pendingRequests.filter((r: any) => r.user._id !== userId);
        this.selectedCommunity.set({ ...comm });
        this.loadMyCommunities();
      },
      error: (err) => {
        this.toastService.error('Failed to reject request');
        console.error(err);
      }
    });
  }

  deleteCommunity() {
    const comm = this.selectedCommunity();
    if (!comm) return;

    if (confirm(`Are you sure you want to permanently delete the community "${comm.name}"? This action cannot be undone.`)) {
      this.groupService.deleteGroup(comm._id).subscribe({
        next: () => {
          this.toastService.success('Community deleted');
          this.loadMyCommunities();
          this.closeManageCommunity();
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Failed to delete community');
          console.error(err);
        }
      });
    }
  }
}
