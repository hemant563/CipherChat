import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface PremiumPurchaseDetails {
  plan: 'monthly' | 'yearly';
  paymentDetails: {
    cardNumber: string;
    expiry: string;
    cvv: string;
  };
}

export interface RazorpayVerificationDetails {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

@Injectable({
  providedIn: 'root'
})
export class PremiumService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payment`;
  private premiumApiUrl = `${environment.apiUrl}/premium`;

  getPremiumStatus(): Observable<any> {
    return this.http.get(`${this.premiumApiUrl}/status`);
  }

  createRazorpayOrder(plan: 'monthly' | 'yearly'): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-order`, { plan });
  }

  verifyRazorpayPayment(data: RazorpayVerificationDetails): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify`, data);
  }

  markPaymentFailed(razorpayOrderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/fail`, { razorpay_order_id: razorpayOrderId });
  }

  insecureCheckout(plan: 'monthly' | 'yearly'): Observable<any> {
    return this.http.post(`${this.apiUrl}/insecure-checkout`, { plan });
  }

  getPaymentHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/history`);
  }
}
