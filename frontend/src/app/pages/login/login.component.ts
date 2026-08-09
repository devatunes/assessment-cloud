import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CandidateAuthService } from '../../core/candidate-auth.service';

type LoginRole = 'org' | 'candidate';

// Una sola pantalla de login para los dos sistemas de cuentas (staff de
// organización y candidatos) — quien entra elige el rol arriba. Por dentro
// siguen siendo dos servicios/JWT completamente separados (ver AuthService y
// CandidateAuthService): esto es solo una UI compartida, no una fusión del
// backend.
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly candidateAuthService = inject(CandidateAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  role: LoginRole = this.route.snapshot.queryParamMap.get('role') === 'candidate' ? 'candidate' : 'org';
  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  selectRole(role: LoginRole): void {
    this.role = role;
    this.error = null;
  }

  submit(): void {
    this.error = null;
    this.loading = true;

    // Tipado explícito: AuthService y CandidateAuthService devuelven formas
    // distintas (AuthResponse vs CandidateAuthResponse) y acá no se usa el
    // payload, solo si tuvo éxito o no.
    const request: Observable<unknown> =
      this.role === 'org'
        ? this.authService.login(this.email, this.password)
        : this.candidateAuthService.login(this.email, this.password);

    request.subscribe({
      next: () => {
        this.loading = false;
        const fallback = this.role === 'org' ? '/questions' : '/practice';
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || fallback;
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.loading = false;
        this.error =
          err?.status === 401
            ? 'Correo o contraseña incorrectos'
            : err?.status === 429
              ? err.error?.message || 'Demasiados intentos, espera unos minutos'
              : 'No se pudo iniciar sesión';
      },
    });
  }
}
