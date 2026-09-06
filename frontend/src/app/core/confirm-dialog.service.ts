import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

// Reemplaza confirm() nativo del navegador por un modal consistente con el
// resto del sistema de diseño. Uso: `if (!(await this.confirmDialog.confirm({...}))) return;`
// — misma ergonomía en el call-site que confirm(), pero async porque el
// usuario responde en un componente aparte, no de forma bloqueante.
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly options = signal<ConfirmOptions | null>(null);

  private resolver: ((value: boolean) => void) | null = null;

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.options.set(options);
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  resolve(value: boolean): void {
    this.resolver?.(value);
    this.resolver = null;
    this.options.set(null);
  }
}
