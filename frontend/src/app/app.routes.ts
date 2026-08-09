import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { candidateAuthGuard } from './core/guards/candidate-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'questions', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'candidato/login',
    loadComponent: () =>
      import('./pages/candidate-login/candidate-login.component').then(
        (m) => m.CandidateLoginComponent,
      ),
  },
  {
    path: 'candidato/registro',
    loadComponent: () =>
      import('./pages/candidate-register/candidate-register.component').then(
        (m) => m.CandidateRegisterComponent,
      ),
  },
  {
    path: 'practica',
    canActivate: [candidateAuthGuard],
    loadComponent: () =>
      import('./pages/practice-catalog/practice-catalog.component').then(
        (m) => m.PracticeCatalogComponent,
      ),
  },
  {
    path: 'practica/historial',
    canActivate: [candidateAuthGuard],
    loadComponent: () =>
      import('./pages/practice-history/practice-history.component').then(
        (m) => m.PracticeHistoryComponent,
      ),
  },
  {
    path: 'questions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/question-library/question-library.component').then(
        (m) => m.QuestionLibraryComponent,
      ),
  },
  {
    path: 'question-banks',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/question-bank-list/question-bank-list.component').then(
        (m) => m.QuestionBankListComponent,
      ),
  },
  {
    path: 'question-banks/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/question-bank-detail/question-bank-detail.component').then(
        (m) => m.QuestionBankDetailComponent,
      ),
  },
  {
    path: 'assessments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/assessment-list/assessment-list.component').then(
        (m) => m.AssessmentListComponent,
      ),
  },
  {
    path: 'assessments/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/assessment-create/assessment-create.component').then(
        (m) => m.AssessmentCreateComponent,
      ),
  },
  {
    path: 'assessments/:id/invite',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/assessment-invite/assessment-invite.component').then(
        (m) => m.AssessmentInviteComponent,
      ),
  },
  {
    path: 'invite/:token',
    loadComponent: () =>
      import('./pages/invite-landing/invite-landing.component').then(
        (m) => m.InviteLandingComponent,
      ),
  },
  {
    path: 'attempt/:id',
    loadComponent: () =>
      import('./pages/attempt-take/attempt-take.component').then(
        (m) => m.AttemptTakeComponent,
      ),
  },
  {
    path: 'attempt/:id/result',
    loadComponent: () =>
      import('./pages/attempt-result/attempt-result.component').then(
        (m) => m.AttemptResultComponent,
      ),
  },
  { path: '**', redirectTo: 'questions' },
];
