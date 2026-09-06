import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CandidateJwtAuthGuard extends AuthGuard('jwt-candidate') {}
