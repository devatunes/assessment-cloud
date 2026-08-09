import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { CandidateAuthService } from './candidate-auth.service';

// Adjunta el Bearer del candidato SOLO a rutas de candidato (/candidate-auth,
// /practice) — nunca a las del staff de organización, que llevan su propio
// token con otra audience (ver auth.interceptor.ts). El wizard /attempts/*
// sigue siendo público y no necesita ningún Bearer: el attemptId ya es la
// credencial (mismo diseño que el flujo de invitación anónima).
export const candidateAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const candidateAuthService = inject(CandidateAuthService);
  const router = inject(Router);
  const isCandidateRoute = req.url.includes('/candidate-auth') || req.url.includes('/practice');
  const token = isCandidateRoute ? candidateAuthService.token : null;

  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error) => {
      if (isCandidateRoute && error?.status === 401 && candidateAuthService.isLoggedIn) {
        candidateAuthService.logout();
        router.navigate(['/candidato/login']);
      }
      return throwError(() => error);
    }),
  );
};
