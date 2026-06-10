import { createReducer, on } from '@ngrx/store';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: any | null;
  token: string | null;
  otpSent: boolean;
  loading: boolean;
  error: string | null;
}

export const initialState: AuthState = {
  user: null,
  token: null,
  otpSent: false,
  loading: false,
  error: null
};

export const authReducer = createReducer(
  initialState,
  
  on(AuthActions.sendOtp, (state) => ({ ...state, loading: true, error: null })),
  on(AuthActions.sendOtpSuccess, (state) => ({ ...state, loading: false, otpSent: true })),
  on(AuthActions.sendOtpFailure, (state, { error }) => ({ ...state, loading: false, error })),
  
  on(AuthActions.verifyOtp, (state) => ({ ...state, loading: true, error: null })),
  on(AuthActions.verifyOtpSuccess, (state, { user, token }) => ({ 
    ...state, loading: false, user, token, otpSent: false 
  })),
  on(AuthActions.verifyOtpFailure, (state, { error }) => ({ ...state, loading: false, error })),
  
  on(AuthActions.logout, () => initialState)
);
