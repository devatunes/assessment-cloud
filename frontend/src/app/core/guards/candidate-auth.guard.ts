import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CandidateAuthService } from '../candidate-auth.service';

export const candidateAuthGuard: CanActivateFn = (_route, state) => {
  const candidateAuthService = inject(CandidateAuthService);
  const router = inject(Router);

  if (candidateAuthService.isLoggedIn) return true;

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
