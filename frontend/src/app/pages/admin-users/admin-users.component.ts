import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { UsersService } from '../../core/users.service';
import { OrgUser, UserRole } from '../../core/models';
import { PaginatorComponent } from '../../shared/paginator.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginatorComponent],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);

  readonly pageSize = 20;

  users: OrgUser[] = [];
  loading = false;
  error: string | null = null;
  page = 1;
  total = 0;

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
    this.usersService.list({ page: this.page, pageSize: this.pageSize }).subscribe({
      next: (result) => {
        this.users = result.items;
        this.total = result.total;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el equipo';
        this.loading = false;
      },
    });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.load();
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
