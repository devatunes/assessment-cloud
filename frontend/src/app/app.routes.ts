import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
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
    path: 'practice',
    canActivate: [candidateAuthGuard],
    loadComponent: () =>
      import('./pages/practice-catalog/practice-catalog.component').then(
        (m) => m.PracticeCatalogComponent,
      ),
  },
  {
    path: 'practice/history',
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
    path: 'questions/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/question-detail/question-detail.component').then(
        (m) => m.QuestionDetailComponent,
      ),
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-users/admin-users.component').then((m) => m.AdminUsersComponent),
  },
  {
    path: 'accept-invite/:token',
    loadComponent: () =>
      import('./pages/accept-invite/accept-invite.component').then(
        (m) => m.AcceptInviteComponent,
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
    path: 'assessments/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/assessment-detail/assessment-detail.component').then(
        (m) => m.AssessmentDetailComponent,
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
    path: 'assessments/:id/report',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/assessment-report/assessment-report.component').then(
        (m) => m.AssessmentReportComponent,
      ),
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/reports-overview/reports-overview.component').then(
        (m) => m.ReportsOverviewComponent,
      ),
  },
  {
    path: 'candidates',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/candidates-history/candidates-history.component').then(
        (m) => m.CandidatesHistoryComponent,
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
