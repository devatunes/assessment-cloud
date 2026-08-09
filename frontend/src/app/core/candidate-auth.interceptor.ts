import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { CandidateAuthService } from './candidate-auth.service';

// Adjunta el Bearer del candidato a rutas de candidato (/candidate-auth,
// /practice) y también a la landing pública de invitación (/invitations/:token
// y su /start) — SIN exigirlo (esas rutas siguen siendo 100% públicas): si el
// candidato está logueado, el backend usa un guard opcional para vincular el
// intento oficial a su cuenta (ver OptionalCandidateAuthGuard). Nunca se
// adjunta a /assessments/:id/invitations, que es la gestión del lado
// organización y lleva su propio token (ver auth.interceptor.ts).
export const candidateAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const candidateAuthService = inject(CandidateAuthService);
  const router = inject(Router);
  const isOrgInvitationManagement = req.url.includes('/assessments/') && req.url.includes('/invitations');
  const isPublicInvitationRoute = !isOrgInvitationManagement && req.url.includes('/invitations/');
  const isCandidateRoute =
    req.url.includes('/candidate-auth') || req.url.includes('/practice') || isPublicInvitationRoute;
  const token = isCandidateRoute ? candidateAuthService.token : null;

  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error) => {
      // La landing de invitación es pública: un 401 ahí no debe deslogear al
      // candidato ni redirigirlo — solo /candidate-auth y /practice exigen
      // sesión de verdad.
      const requiresCandidateSession =
        req.url.includes('/candidate-auth') || req.url.includes('/practice');
      if (requiresCandidateSession && error?.status === 401 && candidateAuthService.isLoggedIn) {
        candidateAuthService.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
