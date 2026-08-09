import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CandidateAuthService } from '../../core/candidate-auth.service';

@Component({
  selector: 'app-candidate-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './candidate-login.component.html',
})
export class CandidateLoginComponent {
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

    this.candidateAuthService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/practica';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
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
