import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AssessmentsService } from '../../core/assessments.service';
import { InvitationsService } from '../../core/invitations.service';
import { Assessment, Invitation } from '../../core/models';

@Component({
  selector: 'app-assessment-invite',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './assessment-invite.component.html',
})
export class AssessmentInviteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly assessmentsService = inject(AssessmentsService);
  private readonly invitationsService = inject(InvitationsService);

  assessment: Assessment | null = null;
  invitations: Invitation[] = [];
  loading = false;
  error: string | null = null;

  candidateName = '';
  candidateEmail = '';
  expiresInDays: number | null = null;
  creating = false;
  lastCreatedLink: string | null = null;
  copied = false;

  private assessmentId = '';

  ngOnInit(): void {
    this.assessmentId = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;

    this.assessmentsService.get(this.assessmentId).subscribe({
      next: (assessment) => {
        this.assessment = assessment;
        this.loadInvitations();
      },
      error: () => {
        this.error = 'No se pudo cargar el assessment';
        this.loading = false;
      },
    });
  }

  loadInvitations(): void {
    this.invitationsService.listForAssessment(this.assessmentId).subscribe({
      next: (invitations) => {
        this.invitations = invitations;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las invitaciones';
        this.loading = false;
      },
    });
  }

  buildLink(token: string): string {
    return `${window.location.origin}/invite/${token}`;
  }

  createInvitation(): void {
    this.error = null;
    this.creating = true;
    this.lastCreatedLink = null;
    this.copied = false;

    this.invitationsService
      .create(this.assessmentId, {
        candidateName: this.candidateName || undefined,
        candidateEmail: this.candidateEmail || undefined,
        expiresInDays: this.expiresInDays || undefined,
      })
      .subscribe({
        next: (invitation) => {
          this.creating = false;
          this.lastCreatedLink = this.buildLink(invitation.token);
          this.candidateName = '';
          this.candidateEmail = '';
          this.expiresInDays = null;
          this.loadInvitations();
        },
        error: () => {
          this.creating = false;
          this.error = 'No se pudo generar la invitación';
        },
      });
  }

  copyLink(link: string): void {
    navigator.clipboard.writeText(link).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }
}
