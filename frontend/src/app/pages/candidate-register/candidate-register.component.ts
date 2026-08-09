import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CandidateAuthService } from '../../core/candidate-auth.service';

@Component({
  selector: 'app-candidate-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './candidate-register.component.html',
})
export class CandidateRegisterComponent {
  private readonly candidateAuthService = inject(CandidateAuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  submit(): void {
    this.error = null;

    if (this.password.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    this.loading = true;
    this.candidateAuthService
      .register({ name: this.name, email: this.email, password: this.password })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigateByUrl('/practica');
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err?.status === 409 ? 'Ya existe una cuenta con este correo' : 'No se pudo crear la cuenta';
        },
      });
  }
}
