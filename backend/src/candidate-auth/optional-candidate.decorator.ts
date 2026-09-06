import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedCandidate } from './candidate-auth-user.interface';

// Complementa a OptionalCandidateAuthGuard: null si la request es anónima,
// el candidato si el Bearer opcional era válido.
export const OptionalCandidate = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedCandidate | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.candidate ?? null;
  },
);
