import { createSelector, createFeatureSelector } from '@ngrx/store';
import { AuthState } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state: AuthState) => !!state.token
);

export const selectUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

export const selectOtpSent = createSelector(
  selectAuthState,
  (state: AuthState) => state.otpSent
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.loading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);
