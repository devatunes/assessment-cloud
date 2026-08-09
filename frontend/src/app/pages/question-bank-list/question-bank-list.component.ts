import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuestionBanksService } from '../../core/question-banks.service';
import { AuthService } from '../../core/auth.service';
import { ContentVisibility, QuestionBank } from '../../core/models';

@Component({
  selector: 'app-question-bank-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './question-bank-list.component.html',
})
export class QuestionBankListComponent implements OnInit {
  private readonly banksService = inject(QuestionBanksService);
  private readonly authService = inject(AuthService);

  banks: QuestionBank[] = [];
  loading = false;
  error: string | null = null;
  removingId: string | null = null;

  showCreateForm = false;
  creating = false;
  createError: string | null = null;

  newBank: { name: string; description: string; visibility: ContentVisibility } = {
    name: '',
    description: '',
    visibility: 'PRIVATE',
  };

  ngOnInit(): void {
    this.load();
  }

  isOwn(bank: QuestionBank): boolean {
    return bank.organizationId === this.authService.currentUser()?.organizationId;
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.banksService.list().subscribe({
      next: (banks) => {
        this.banks = banks;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los bancos de preguntas';
        this.loading = false;
      },
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.createError = null;
  }

  submitNewBank(): void {
    if (!this.newBank.name.trim()) {
      this.createError = 'El nombre es obligatorio';
      return;
    }

    this.creating = true;
    this.createError = null;

    this.banksService
      .create({
        name: this.newBank.name,
        description: this.newBank.description || undefined,
        visibility: this.newBank.visibility,
      })
      .subscribe({
        next: () => {
          this.creating = false;
          this.showCreateForm = false;
          this.newBank = { name: '', description: '', visibility: 'PRIVATE' };
          this.load();
        },
        error: () => {
          this.creating = false;
          this.createError = 'No se pudo crear el banco';
        },
      });
  }

  remove(bank: QuestionBank): void {
    if (!confirm(`¿Eliminar el banco "${bank.name}"? Las preguntas en sí no se borran.`)) {
      return;
    }

    this.removingId = bank.id;
    this.banksService.remove(bank.id).subscribe({
      next: () => {
        this.removingId = null;
        this.load();
      },
      error: () => {
        this.removingId = null;
        this.error = 'No se pudo eliminar el banco';
      },
    });
  }
}
