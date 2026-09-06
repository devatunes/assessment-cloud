import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Adjunta el Bearer del staff de organización a las llamadas a la API.
// Los endpoints públicos (attempts, invitations/:token) simplemente no
// tienen token y siguen sin header — el backend decide si lo exige o no.
// Nunca se adjunta a rutas de candidato (/candidate-auth, /practice) ni a la
// landing pública de invitación (/invitations/:token, que ahora acepta
// opcionalmente el Bearer del CANDIDATO, no el de organización): esas llevan
// su propio Bearer con otra audience (ver candidate-auth.interceptor.ts) y
// jamás deben mezclarse, aunque ambas sesiones convivan en el mismo navegador.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isOrgInvitationManagement = req.url.includes('/assessments/') && req.url.includes('/invitations');
  const isPublicInvitationRoute = !isOrgInvitationManagement && req.url.includes('/invitations/');
  const isCandidateRoute =
    req.url.includes('/candidate-auth') || req.url.includes('/practice') || isPublicInvitationRoute;
  const token = isCandidateRoute ? null : authService.token;

  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error) => {
      if (!isCandidateRoute && error?.status === 401 && authService.isLoggedIn) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
