import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { logout } from '../../store/auth/auth.actions';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // In SSR, localStorage might not be available, handle gracefully
  let token = null;
  const router = inject(Router);
  const store = inject(Store);
  
  if (typeof window !== 'undefined' && localStorage) {
    token = localStorage.getItem('accessToken');
  }

  const handleAuthError = (err: any) => {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      // Token is expired or invalid
      if (typeof window !== 'undefined' && localStorage) {
        localStorage.removeItem('accessToken');
      }
      store.dispatch(logout());
      
      // Check if we aren't already on the landing page to prevent infinite loops
      if (router.url !== '/landing') {
        router.navigate(['/landing']);
      }
    }
    return throwError(() => err);
  };

  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq).pipe(catchError(handleAuthError));
  }

  return next(req).pipe(catchError(handleAuthError));
};
