import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { CallModal } from '../../components/call-modal/call-modal';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule, CallModal],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
})
export class AppLayout implements OnInit, OnDestroy {
  isCollapsed = signal(true);
  public router = inject(Router);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);

  myUser = signal<any>(null);

  ngOnInit() {
    // Subscribe to global user state
    this.userService.currentUser$.subscribe(user => {
      this.myUser.set(user);
      if (user && typeof window !== 'undefined' && this.authService.getToken()) {
        this.socketService.connect();
      }
    });

    this.authService.logoutEvent.subscribe(() => {
      this.myUser.set(null);
      this.socketService.disconnect();
    });

    // Make an initial fetch to ensure data is fresh
    if (typeof window !== 'undefined' && this.authService.getToken()) {
      this.userService.getProfile().subscribe({
        error: (err) => {
          if (err.status === 401) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      });
    }
  }

  ngOnDestroy() {
    this.socketService.disconnect();
  }

  getAvatarUrl(url: string | undefined): string {
    return this.userService.getAvatarUrl(url);
  }



  toggleSidebar() {
    this.isCollapsed.update(v => !v);
  }
}
