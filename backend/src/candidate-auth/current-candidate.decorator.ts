import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedCandidate } from './candidate-auth-user.interface';

export const CurrentCandidate = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedCandidate => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedCandidate;
  },
);
