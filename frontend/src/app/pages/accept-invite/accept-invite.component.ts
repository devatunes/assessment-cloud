import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accept-invite.component.html',
})
export class AcceptInviteComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  password = '';
  loading = false;
  error: string | null = null;

  submit(): void {
    this.error = null;

    if (this.password.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    const token = this.route.snapshot.paramMap.get('token')!;
    this.loading = true;

    this.authService.acceptInvite(token, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/questions');
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.status === 400
            ? 'El link de activación es inválido o expiró'
            : 'No se pudo activar la cuenta';
      },
    });
  }
}
