import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InvitationsService } from '../../core/invitations.service';
import { CandidateAuthService } from '../../core/candidate-auth.service';
import { InvitationPublicView } from '../../core/models';

type GateStep = 'email' | 'login' | 'register' | 'ready';

// Landing pública del candidato invitado. A diferencia de versiones
// anteriores, empezar un assessment oficial NUEVO (status PENDING) ahora
// exige identificarse: se pregunta el correo, y según si ya tiene cuenta de
// candidato se pide login o registro — así el resultado siempre queda
// vinculado a una cuenta e visible en su historial. Retomar un intento ya
// STARTED/COMPLETED NO pasa por esta puerta (ver ngOnInit): exigir login de
// nuevo en cada refresh de una página a mitad de examen sería una regresión
// grave, y el backend ya soporta retomar sin auth (OptionalCandidateAuthGuard).
@Component({
  selector: 'app-invite-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invite-landing.component.html',
})
export class InviteLandingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitationsService = inject(InvitationsService);
  protected readonly candidateAuthService = inject(CandidateAuthService);

  invitation: InvitationPublicView | null = null;
  loading = false;
  starting = false;
  error: string | null = null;

  candidateName = '';

  // Puerta de identidad, solo para invitaciones PENDING sin sesión activa.
  step: GateStep = 'ready';
  gateEmail = '';
  gatePassword = '';
  checkingEmail = false;
  gateError: string | null = null;

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token')!;
    this.loading = true;

    this.invitationsService.getByToken(this.token).subscribe({
      next: (invitation) => {
        this.invitation = invitation;
        this.candidateName = invitation.candidateName || '';
        this.loading = false;

        // Ya en curso o completado: retomar directo, sin pasar por la puerta.
        if (invitation.status === 'STARTED' || invitation.status === 'COMPLETED') {
          this.start();
          return;
        }

        if (invitation.status === 'PENDING') {
          if (this.candidateAuthService.isLoggedIn) {
            this.step = 'ready';
          } else {
            this.step = 'email';
            this.gateEmail = invitation.candidateEmail || '';
          }
        }
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.status === 404 ? 'Esta invitación no existe' : 'No se pudo cargar la invitación';
      },
    });
  }

  submitEmail(): void {
    if (!this.gateEmail.trim()) {
      this.gateError = 'Ingresa tu correo';
      return;
    }

    this.gateError = null;
    this.checkingEmail = true;

    this.candidateAuthService.checkEmail(this.gateEmail).subscribe({
      next: ({ exists }) => {
        this.checkingEmail = false;
        this.step = exists ? 'login' : 'register';
      },
      error: () => {
        this.checkingEmail = false;
        this.gateError = 'No se pudo verificar el correo';
      },
    });
  }

  backToEmail(): void {
    this.step = 'email';
    this.gatePassword = '';
    this.gateError = null;
  }

  loginAndStart(): void {
    if (!this.gatePassword) {
      this.gateError = 'Ingresa tu contraseña';
      return;
    }

    this.gateError = null;
    this.starting = true;

    this.candidateAuthService.login(this.gateEmail, this.gatePassword).subscribe({
      next: (res) => {
        this.candidateName = res.candidate.name;
        this.step = 'ready';
        this.start();
      },
      error: () => {
        this.starting = false;
        this.gateError = 'Correo o contraseña incorrectos';
      },
    });
  }

  registerAndStart(): void {
    if (!this.candidateName.trim()) {
      this.gateError = 'Ingresa tu nombre';
      return;
    }
    if (!this.gatePassword || this.gatePassword.length < 8) {
      this.gateError = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    this.gateError = null;
    this.starting = true;

    this.candidateAuthService
      .register({ name: this.candidateName, email: this.gateEmail, password: this.gatePassword })
      .subscribe({
        next: () => {
          this.step = 'ready';
          this.start();
        },
        error: (err) => {
          this.starting = false;
          this.gateError =
            err?.status === 409 ? 'Ya existe una cuenta con este correo' : 'No se pudo crear la cuenta';
        },
      });
  }

  start(): void {
    if (!this.candidateName.trim() && this.invitation?.status === 'PENDING') {
      this.error = 'Ingresa tu nombre para comenzar';
      return;
    }

    this.error = null;
    this.starting = true;

    this.invitationsService.start(this.token, this.candidateName).subscribe({
      next: (attempt) => {
        this.starting = false;
        if (attempt.status === 'COMPLETED') {
          this.router.navigate(['/attempt', attempt.id, 'result']);
        } else {
          this.router.navigate(['/attempt', attempt.id]);
        }
      },
      error: () => {
        this.starting = false;
        this.error = 'No se pudo iniciar el assessment';
      },
    });
  }
}
