import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  { path: 'landing', loadComponent: () => import('./pages/landing-page/landing-page').then(m => m.LandingPage) },
  { path: 'chat', loadComponent: () => import('./pages/chat-dashboard/chat-dashboard').then(m => m.ChatDashboard) },
  { path: 'communities', loadComponent: () => import('./pages/explore-communities/explore-communities').then(m => m.ExploreCommunities) },
  { path: 'calls', loadComponent: () => import('./pages/calls-dashboard/calls-dashboard').then(m => m.CallsDashboard) },
  { path: 'profile', loadComponent: () => import('./pages/profile-settings/profile-settings').then(m => m.ProfileSettings) },
  { path: 'premium', loadComponent: () => import('./pages/premium-plans/premium-plans').then(m => m.PremiumPlans) }
];
