import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { CandidateAuthService } from './core/candidate-auth.service';
import { ThemeService } from './core/theme.service';
import { OnboardingTourComponent } from './shared/onboarding-tour.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, OnboardingTourComponent],
  template: `
    <header class="app-header">
      <hgroup>
        <h1>Assessment Cloud</h1>
        <p>Plataforma de evaluaciones técnicas</p>
      </hgroup>
      <nav class="app-nav">
        @if (authService.isLoggedIn) {
          <a routerLink="/questions" routerLinkActive="contrast">Preguntas</a>
          <a routerLink="/question-banks" routerLinkActive="contrast">Bancos</a>
          <a routerLink="/assessments" routerLinkActive="contrast">Assessments</a>
          <a routerLink="/reports" routerLinkActive="contrast">Reportes</a>
          @if (authService.isAdmin) {
            <a routerLink="/admin/users" routerLinkActive="contrast">Usuarios</a>
          }
          <span>{{ authService.currentUser()?.name }}</span>
          <a href="#" (click)="logout($event)">Cerrar sesión</a>
        } @else if (candidateAuthService.isLoggedIn) {
          <a routerLink="/practica" routerLinkActive="contrast">Practicar</a>
          <a routerLink="/practica/historial" routerLinkActive="contrast">Mi historial</a>
          <span>{{ candidateAuthService.currentCandidate()?.name }}</span>
          <a href="#" (click)="logoutCandidate($event)">Cerrar sesión</a>
        } @else {
          <a routerLink="/login" routerLinkActive="contrast">Iniciar sesión</a>
          <a routerLink="/register" routerLinkActive="contrast">Crear organización</a>
          <a routerLink="/candidato/login" routerLinkActive="contrast">Practicar (candidatos)</a>
        }
        <button
          type="button"
          class="theme-toggle outline secondary"
          (click)="themeService.toggle()"
          [attr.aria-label]="themeService.theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          {{ themeService.theme() === 'dark' ? '☀️' : '🌙' }}
        </button>
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
    <app-onboarding-tour />
  `,
})
export class AppComponent {
  protected readonly authService = inject(AuthService);
  protected readonly candidateAuthService = inject(CandidateAuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  logoutCandidate(event: Event): void {
    event.preventDefault();
    this.candidateAuthService.logout();
    this.router.navigateByUrl('/candidato/login');
  }
}
