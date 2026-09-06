import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface AttemptState {
  failures: number;
  firstFailureAt: number;
  lockUntil?: number;
}

// Bloqueo por intentos fallidos, en memoria. Nota: no persiste entre cold
// starts de Lambda ni se comparte entre instancias concurrentes — es
// best-effort en este deploy serverless, no una garantía dura.
@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, AttemptState>();
  private readonly maxAttempts = parseInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS || '5', 10);
  private readonly windowMs =
    parseInt(process.env.AUTH_LOGIN_WINDOW_MINUTES || '15', 10) * 60 * 1000;
  private readonly lockMs =
    parseInt(process.env.AUTH_LOGIN_LOCK_MINUTES || '15', 10) * 60 * 1000;

  assertNotLocked(email: string, ipAddress: string): void {
    const key = this.buildKey(email, ipAddress);
    const state = this.attempts.get(key);

    if (!state) return;

    if (state.lockUntil && state.lockUntil > Date.now()) {
      const retryInMinutes = Math.ceil((state.lockUntil - Date.now()) / (60 * 1000));
      throw new HttpException(
        `Demasiados intentos fallidos. Intenta de nuevo en ${retryInMinutes} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (state.lockUntil && state.lockUntil <= Date.now()) {
      this.attempts.delete(key);
    }
  }

  recordFailure(email: string, ipAddress: string): void {
    const key = this.buildKey(email, ipAddress);
    const now = Date.now();
    const state = this.attempts.get(key);

    if (!state || now - state.firstFailureAt > this.windowMs) {
      this.attempts.set(key, { failures: 1, firstFailureAt: now });
      return;
    }

    const nextFailures = state.failures + 1;

    if (nextFailures >= this.maxAttempts) {
      this.attempts.set(key, {
        failures: nextFailures,
        firstFailureAt: state.firstFailureAt,
        lockUntil: now + this.lockMs,
      });
      return;
    }

    this.attempts.set(key, { failures: nextFailures, firstFailureAt: state.firstFailureAt });
  }

  clear(email: string, ipAddress: string): void {
    this.attempts.delete(this.buildKey(email, ipAddress));
  }

  private buildKey(email: string, ipAddress: string): string {
    return `${(ipAddress || 'unknown').trim().toLowerCase()}:${email.trim().toLowerCase()}`;
  }
}
