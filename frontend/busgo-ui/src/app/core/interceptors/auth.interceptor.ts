import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { ApiError } from '../models/error.model';

/**
 * Attaches the JWT (when present) to every outgoing request, and maps the backend's structured
 * error JSON { timestamp, path, error, message } to a user-facing toast so components don't each
 * need their own error-handling boilerplate.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);

  const token = auth.token;
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const apiError = err.error as ApiError | undefined;
      const message = apiError?.message || err.message || 'Something went wrong. Please try again.';

      if (err.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        router.navigate(['/login']);
      } else if (err.status === 403) {
        toast.error(message || 'You do not have permission to do that.');
      } else if (err.status === 0) {
        toast.error('Could not reach the server. Is the backend running?');
      } else {
        toast.error(message);
      }

      return throwError(() => err);
    })
  );
};
