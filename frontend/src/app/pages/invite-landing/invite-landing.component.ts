import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InvitationsService } from '../../core/invitations.service';
import { InvitationPublicView } from '../../core/models';

// Landing pública del candidato invitado (reemplaza el viejo flujo abierto
// de "Iniciar como candidato" desde una lista pública de assessments). El
// token en la URL es la única credencial — no hay cuenta de candidato acá
// (eso es solo para simulacros, ver pages/practice/).
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

  invitation: InvitationPublicView | null = null;
  loading = false;
  starting = false;
  error: string | null = null;

  candidateName = '';

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token')!;
    this.loading = true;

    this.invitationsService.getByToken(this.token).subscribe({
      next: (invitation) => {
        this.invitation = invitation;
        this.candidateName = invitation.candidateName || '';
        this.loading = false;

        // Ya en curso o completado: saltar directo, sin pedir el nombre de nuevo.
        if (invitation.status === 'STARTED' || invitation.status === 'COMPLETED') {
          this.start();
        }
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.status === 404 ? 'Esta invitación no existe' : 'No se pudo cargar la invitación';
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
