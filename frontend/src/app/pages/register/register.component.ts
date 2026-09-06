import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CandidateAuthService } from '../../core/candidate-auth.service';

type RegisterRole = 'org' | 'candidate';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly candidateAuthService = inject(CandidateAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  role: RegisterRole = this.route.snapshot.queryParamMap.get('role') === 'candidate' ? 'candidate' : 'org';

  organizationName = '';
  adminName = '';
  candidateName = '';
  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  selectRole(role: RegisterRole): void {
    this.role = role;
    this.error = null;
  }

  submit(): void {
    this.error = null;

    if (this.password.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    this.loading = true;

    // Tipado explícito: los dos servicios devuelven formas distintas y acá
    // no se usa el payload, solo si tuvo éxito o no.
    const request: Observable<unknown> =
      this.role === 'org'
        ? this.authService.registerOrganization({
            organizationName: this.organizationName,
            adminName: this.adminName,
            email: this.email,
            password: this.password,
          })
        : this.candidateAuthService.register({
            name: this.candidateName,
            email: this.email,
            password: this.password,
          });

    request.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl(this.role === 'org' ? '/questions' : '/practice');
      },
      error: (err: { status?: number }) => {
        this.loading = false;
        this.error =
          err?.status === 409
            ? 'Ya existe una cuenta con este correo'
            : this.role === 'org'
              ? 'No se pudo crear la organización'
              : 'No se pudo crear la cuenta';
      },
    });
  }
}
