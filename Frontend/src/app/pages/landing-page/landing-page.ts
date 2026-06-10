import { Component, inject, signal, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ParticleBgComponent } from '../../components/particle-bg/particle-bg.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ParticleBgComponent],
  templateUrl: './landing-page.html',
  styleUrls: []
})
export class LandingPage {
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);

  @ViewChild('mainContainer') mainContainer!: ElementRef;

  authMode = signal<'SIGNUP' | 'LOGIN'>('SIGNUP');
  step = signal<'DETAILS' | 'OTP' | 'FORGOT_PASSWORD'>('DETAILS');
  
  usernameCheckSubject = new Subject<string>();
  usernameAvailable = signal<boolean | null>(null);
  isCheckingUsername = signal(false);

  constructor() {
    this.usernameCheckSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(username => {
      if (!username || username.length < 3) {
        this.usernameAvailable.set(null);
        return;
      }
      this.isCheckingUsername.set(true);
      this.authService.checkUsername(username).subscribe({
        next: (res) => {
          this.usernameAvailable.set(res.data.isAvailable);
          this.isCheckingUsername.set(false);
          if (!res.data.isAvailable) {
             this.errorMessage.set('Username is already taken');
          } else {
             if (this.errorMessage() === 'Username is already taken') {
                this.errorMessage.set('');
             }
          }
        },
        error: () => {
          this.isCheckingUsername.set(false);
        }
      });
    });
  }
  

  
  username = signal('');
  password = signal('');
  newPassword = signal('');
  email = signal('');
  otp = signal('');
  errorMessage = signal('');

  toggleMode() {
    this.authMode.set(this.authMode() === 'SIGNUP' ? 'LOGIN' : 'SIGNUP');
    this.step.set('DETAILS');
    this.username.set('');
    this.password.set('');
    this.newPassword.set('');
    this.email.set('');
    this.otp.set('');
    this.errorMessage.set('');
    this.usernameAvailable.set(null);
    this.isCheckingUsername.set(false);
  }

  onUsernameChange(val: string) {
    this.username.set(val);
    if (this.authMode() === 'SIGNUP') {
      this.usernameCheckSubject.next(val.toLowerCase());
    }
  }

  doLogin() {
    this.errorMessage.set('');
    if (!this.username() || !this.password()) {
      this.errorMessage.set('Please enter username and password');
      return;
    }
    const cleanUsername = this.username().toLowerCase().trim();
    this.authService.login({ username: cleanUsername, password: this.password() }).subscribe({
      next: (res) => {
        if (res.data?.requiresTwoStep) {
          this.email.set(res.data.email);
          this.step.set('OTP');
          this.toastService.success('OTP sent to your email');
        } else {
          this.router.navigate(['/chat']);
        }
      },
      error: (err) => this.errorMessage.set(err.error?.message || 'Login failed')
    });
  }

  requestOtp() {
    this.errorMessage.set('');
    if (this.authMode() === 'SIGNUP') {
      if (!this.username() || !this.email() || !this.password()) {
        this.errorMessage.set('Please fill in all details');
        return;
      }
      if (this.username().length < 3) {
        this.errorMessage.set('Username must be at least 3 characters');
        return;
      }
      if (this.password().length < 6) {
        this.errorMessage.set('Password must be at least 6 characters');
        return;
      }
      if (this.usernameAvailable() === false) {
        this.errorMessage.set('Username is already taken');
        return;
      }
    } else {
      if (!this.email()) {
        this.errorMessage.set('Please provide your email address');
        return;
      }
    }

    this.authService.requestOtp(this.email(), this.authMode() === 'LOGIN' ? this.username() : undefined).subscribe({
      next: (res) => {
        this.toastService.success('OTP sent to your email');
        this.step.set('OTP');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to send OTP');
      }
    });
  }

  verifyOtpAndRegister() {
    if (!this.otp() || this.otp().length < 4) {
      this.errorMessage.set('Please enter a valid OTP');
      return;
    }

    const safeEmail = this.email().trim();
    const safeUsername = this.username().trim();
    
    this.authService.verifyOtp(safeEmail, this.otp().trim(), this.authMode() === 'LOGIN' ? safeUsername : undefined).subscribe({
      next: (res) => {
        if (res.data.isRegistered) {
          // Login complete
          this.toastService.success('Login successful');
          this.router.navigate(['/chat']);
        } else {
          // Proceed to registration
          if (this.authMode() === 'LOGIN') {
             // they tried to login but account doesn't exist
             this.errorMessage.set('No account found for this email. Please sign up.');
             this.authMode.set('SIGNUP');
             this.step.set('DETAILS');
             return;
          }
          const otpToken = res.data.otpToken;
          const cleanUsername = this.username().toLowerCase().replace(/[^a-z0-9_]/g, '_');
          this.authService.register({
            email: safeEmail,
            otpToken,
            username: cleanUsername,
            password: this.password(),
            displayName: safeUsername
          }).subscribe({
            next: () => {
              this.toastService.success('Registration successful');
              this.router.navigate(['/chat']);
            },
            error: (err) => {
              const specificError = err.error?.errors?.[0];
              this.errorMessage.set(specificError || err.error?.message || 'Registration failed');
            }
          });
        }
      },error: (err) => {
        const specificError = err.error?.errors?.[0];
        this.errorMessage.set(specificError || err.error?.message || 'Invalid OTP');
      }
    });
  }

  requestForgotPassword() {
    this.errorMessage.set('');
    if (!this.username()) {
      this.errorMessage.set('Please enter your username first');
      return;
    }
    
    // We send empty email because the backend will look it up using the username
    this.authService.requestOtp('', this.username()).subscribe({
      next: (res) => {
        this.toastService.success('OTP sent to your registered email');
        this.step.set('FORGOT_PASSWORD');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to send OTP. Ensure your username is correct.');
      }
    });
  }

  resetPassword() {
    this.errorMessage.set('');
    if (!this.otp() || this.otp().length < 6) {
      this.errorMessage.set('Please enter a valid 6-digit OTP');
      return;
    }
    if (!this.newPassword() || this.newPassword().length < 6) {
      this.errorMessage.set('Password must be at least 6 characters');
      return;
    }

    this.authService.resetPassword(this.username(), this.otp(), this.newPassword()).subscribe({
      next: (res) => {
        this.toastService.success('Password reset successfully! Please sign in.');
        this.step.set('DETAILS');
        this.password.set('');
        this.newPassword.set('');
        this.otp.set('');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to reset password');
      }
    });
  }
}
