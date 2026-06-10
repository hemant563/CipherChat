import { createAction, props } from '@ngrx/store';

// OTP Actions
export const sendOtp = createAction('[Auth] Send OTP', props<{ phone: string }>());
export const sendOtpSuccess = createAction('[Auth] Send OTP Success');
export const sendOtpFailure = createAction('[Auth] Send OTP Failure', props<{ error: string }>());

export const verifyOtp = createAction('[Auth] Verify OTP', props<{ code: string }>());
export const verifyOtpSuccess = createAction('[Auth] Verify OTP Success', props<{ user: any, token: string }>());
export const verifyOtpFailure = createAction('[Auth] Verify OTP Failure', props<{ error: string }>());

export const logout = createAction('[Auth] Logout');
