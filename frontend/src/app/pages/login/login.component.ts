import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CandidateAuthService } from '../../core/candidate-auth.service';

type LoginError = { status?: number; error?: { message?: string } };

// Login único para los dos sistemas de cuentas: no se pide elegir rol — el
// correo ya identifica a cuál pertenece la cuenta, así que se prueba primero
// como staff de organización y, solo si esas credenciales no existen (401),
// se reintenta como candidato. Por dentro siguen siendo dos servicios/JWT
// completamente separados (ver AuthService y CandidateAuthService): esto es
// solo una inferencia en la UI, no una fusión del backend.
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

  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  submit(): void {
    this.error = null;
    this.loading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: () => this.onSuccess('/questions'),
      error: (orgErr: LoginError) => {
        if (orgErr?.status !== 401) {
          this.onError(orgErr);
          return;
        }

        // No es una cuenta de organización (o la contraseña no coincide):
        // reintenta como candidato antes de darlo por credenciales inválidas.
        this.candidateAuthService.login(this.email, this.password).subscribe({
          next: () => this.onSuccess('/practice'),
          error: () => this.onError(orgErr),
        });
      },
    });
  }

  private onSuccess(fallback: string): void {
    this.loading = false;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || fallback;
    this.router.navigateByUrl(returnUrl);
  }

  private onError(err: LoginError): void {
    this.loading = false;
    this.error =
      err?.status === 401
        ? 'Correo o contraseña incorrectos'
        : err?.status === 429
          ? err.error?.message || 'Demasiados intentos, espera unos minutos'
          : 'No se pudo iniciar sesión';
  }
}
