import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { UsersService } from '../../core/users.service';
import { OrgUser, UserRole } from '../../core/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);

  users: OrgUser[] = [];
  loading = false;
  error: string | null = null;

  showInviteForm = false;
  inviteName = '';
  inviteEmail = '';
  inviteRole: UserRole = 'RECRUITER';
  inviting = false;
  inviteError: string | null = null;
  lastActivationLink: string | null = null;
  copied = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.usersService.list().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el equipo';
        this.loading = false;
      },
    });
  }

  toggleInviteForm(): void {
    this.showInviteForm = !this.showInviteForm;
    this.inviteError = null;
  }

  invite(): void {
    this.inviteError = null;
    this.inviting = true;
    this.lastActivationLink = null;
    this.copied = false;

    this.authService
      .inviteTeammate({ name: this.inviteName, email: this.inviteEmail, role: this.inviteRole })
      .subscribe({
        next: (res) => {
          this.inviting = false;
          this.lastActivationLink = `${window.location.origin}/accept-invite/${res.activationToken}`;
          this.inviteName = '';
          this.inviteEmail = '';
          this.inviteRole = 'RECRUITER';
          this.load();
        },
        error: (err) => {
          this.inviting = false;
          this.inviteError =
            err?.status === 409 ? 'Ya existe una cuenta con este correo' : 'No se pudo invitar al usuario';
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
