import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'questions', pathMatch: 'full' },
  {
    path: 'questions',
    loadComponent: () =>
      import('./pages/question-library/question-library.component').then(
        (m) => m.QuestionLibraryComponent,
      ),
  },
  {
    path: 'assessments',
    loadComponent: () =>
      import('./pages/assessment-list/assessment-list.component').then(
        (m) => m.AssessmentListComponent,
      ),
  },
  {
    path: 'assessments/new',
    loadComponent: () =>
      import('./pages/assessment-create/assessment-create.component').then(
        (m) => m.AssessmentCreateComponent,
      ),
  },
  {
    path: 'assessments/:id/start',
    loadComponent: () =>
      import('./pages/attempt-start/attempt-start.component').then(
        (m) => m.AttemptStartComponent,
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
