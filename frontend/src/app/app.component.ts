import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="app-header">
      <hgroup>
        <h1>Assessment Cloud</h1>
        <p>Plataforma de evaluaciones técnicas</p>
      </hgroup>
      <nav class="app-nav">
        @if (authService.isLoggedIn) {
          <a routerLink="/questions" routerLinkActive="contrast">Preguntas</a>
          <a routerLink="/assessments" routerLinkActive="contrast">Assessments</a>
          @if (authService.isAdmin) {
            <a routerLink="/admin/users" routerLinkActive="contrast">Usuarios</a>
          }
          <span>{{ authService.currentUser()?.name }}</span>
          <a href="#" (click)="logout($event)">Cerrar sesión</a>
        } @else {
          <a routerLink="/login" routerLinkActive="contrast">Iniciar sesión</a>
          <a routerLink="/register" routerLinkActive="contrast">Crear organización</a>
        }
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
