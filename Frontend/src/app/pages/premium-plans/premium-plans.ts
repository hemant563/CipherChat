import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PremiumService, RazorpayVerificationDetails } from '../../services/premium.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';

declare var Razorpay: any;

@Component({
  selector: 'app-premium-plans',
  imports: [CommonModule, FormsModule],
  templateUrl: './premium-plans.html',
  styleUrl: './premium-plans.css'
})
export class PremiumPlans implements OnInit {
  private premiumService = inject(PremiumService);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private router = inject(Router);

  isPremium = signal(false);
  activePlan = signal<'monthly' | 'yearly'>('monthly');
  isLoading = signal(false);

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.premiumService.getPremiumStatus().subscribe({
        next: (res) => {
          if (res.data.status?.isPremium) {
            this.isPremium.set(true);
          }
          if (res.data.expiredJustNow) {
            this.toastService.warning('Your premium membership has expired.');
          }
        },
        error: (err) => {
          console.error('Failed to get premium status', err);
        }
      });
    }
  }

  selectPlan(plan: 'monthly' | 'yearly') {
    this.activePlan.set(plan);
  }

  async initiatePayment() {
    this.isLoading.set(true);

    // 1. Create order on backend
    this.premiumService.createRazorpayOrder(this.activePlan()).subscribe({
      next: (orderRes) => {
        const { orderId, amount, currency, keyId } = orderRes.data;

        const options = {
          key: keyId,
          amount: amount,
          currency: currency,
          name: 'CipherChat',
          description: 'Premium Membership',
          order_id: orderId,
          theme: {
            color: '#f59e0b' // Amber color matching theme
          },
          handler: (response: any) => {
            this.verifyPayment(response);
          },
          modal: {
            ondismiss: () => {
              this.isLoading.set(false);
              this.toastService.warning('Payment cancelled.');
              this.premiumService.markPaymentFailed(orderId).subscribe();
            }
          }
        };

        try {
          const rzp = new Razorpay(options);
          rzp.on('payment.failed', (response: any) => {
            this.premiumService.markPaymentFailed(orderId).subscribe();
          });
          rzp.open();
        } catch (error) {
          this.isLoading.set(false);
          this.toastService.error('Failed to load Razorpay checkout. Check your internet connection.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error(err.error?.message || 'Failed to initialize payment.');
      }
    });
  }

  verifyPayment(response: any) {
    const data: RazorpayVerificationDetails = {
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    };

    this.premiumService.verifyRazorpayPayment(data).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.toastService.success('Premium membership activated successfully!');
        this.isPremium.set(true);
        
        // Refresh user profile to get the new status globally
        this.userService.getProfile().subscribe();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error(err.error?.message || 'Payment verification failed.');
      }
    });
  }

  initiateInsecureCheckout() {
    this.isLoading.set(true);
    this.premiumService.insecureCheckout(this.activePlan()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.toastService.success('Premium membership activated successfully (Bypass)!');
        this.isPremium.set(true);
        this.userService.getProfile().subscribe();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error(err.error?.message || 'Bypass failed.');
      }
    });
  }
}
