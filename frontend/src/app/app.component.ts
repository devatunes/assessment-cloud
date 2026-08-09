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
      <div class="app-header-top">
        <a class="app-brand" routerLink="/">
          <span class="app-brand-mark">☁️</span>
          <hgroup>
            <h1>Assessment Cloud</h1>
            <p>Plataforma de evaluaciones técnicas</p>
          </hgroup>
        </a>
        <div class="app-header-actions">
          @if (authService.isLoggedIn) {
            <span class="user-chip">
              <span class="user-avatar">{{ initials(authService.currentUser()?.name) }}</span>
              <span class="user-chip-text">
                <strong>{{ authService.currentUser()?.name }}</strong>
                <small>{{ authService.currentUser()?.organizationName }}</small>
              </span>
            </span>
            <a class="nav-pill" href="#" (click)="logout($event)">Salir</a>
          } @else if (candidateAuthService.isLoggedIn) {
            <span class="user-chip">
              <span class="user-avatar">{{ initials(candidateAuthService.currentCandidate()?.name) }}</span>
              {{ candidateAuthService.currentCandidate()?.name }}
            </span>
            <a class="nav-pill" href="#" (click)="logoutCandidate($event)">Salir</a>
          } @else {
            <a class="nav-pill" routerLink="/login" routerLinkActive="active">Iniciar sesión</a>
            <a class="nav-pill" routerLink="/register" routerLinkActive="active">Crear cuenta</a>
          }
          <button
            type="button"
            class="theme-toggle outline secondary"
            (click)="themeService.toggle()"
            [attr.aria-label]="themeService.theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          >
            {{ themeService.theme() === 'dark' ? '☀️' : '🌙' }}
          </button>
        </div>
      </div>
      @if (authService.isLoggedIn || candidateAuthService.isLoggedIn) {
        <nav class="app-nav">
          @if (authService.isLoggedIn) {
            <a class="nav-pill" routerLink="/questions" routerLinkActive="active">Preguntas</a>
            <a class="nav-pill" routerLink="/question-banks" routerLinkActive="active">Bancos</a>
            <a class="nav-pill" routerLink="/assessments" routerLinkActive="active">Assessments</a>
            <a class="nav-pill" routerLink="/candidates" routerLinkActive="active">Candidatos</a>
            <a class="nav-pill" routerLink="/reports" routerLinkActive="active">Reportes</a>
            @if (authService.isAdmin) {
              <a class="nav-pill" routerLink="/admin/users" routerLinkActive="active">Usuarios</a>
            }
          } @else if (candidateAuthService.isLoggedIn) {
            <a class="nav-pill" routerLink="/practice" routerLinkActive="active">Practicar</a>
            <a class="nav-pill" routerLink="/practice/history" routerLinkActive="active">Mi historial</a>
          }
        </nav>
      }
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

  initials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  logoutCandidate(event: Event): void {
    event.preventDefault();
    this.candidateAuthService.logout();
    this.router.navigateByUrl('/login');
  }
}
