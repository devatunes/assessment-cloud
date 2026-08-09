import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  organizationName = '';
  adminName = '';
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
    this.authService
      .registerOrganization({
        organizationName: this.organizationName,
        adminName: this.adminName,
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigateByUrl('/questions');
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err?.status === 409
              ? 'Ya existe una cuenta con este correo'
              : 'No se pudo crear la organización';
        },
      });
  }
}
