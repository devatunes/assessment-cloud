import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Candidate } from '../candidates/entities/candidate.entity';
import { CandidatesService } from '../candidates/candidates.service';
import { LoginAttemptsService } from '../auth/login-attempts.service';
import { RegisterCandidateDto } from './dto/register-candidate.dto';
import { LoginCandidateDto } from './dto/login-candidate.dto';

function toSafeCandidate(candidate: Candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
  };
}

@Injectable()
export class CandidateAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly candidatesService: CandidatesService,
    private readonly loginAttemptsService: LoginAttemptsService,
  ) {}

  async findByEmail(email: string): Promise<Candidate | null> {
    return this.candidatesService.findByEmail(email);
  }

  async register(dto: RegisterCandidateDto) {
    const existing = await this.candidatesService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este correo');
    }

    const candidate = await this.candidatesService.create(dto);

    return this.buildAuthResponse(candidate);
  }

  async login(dto: LoginCandidateDto, ipAddress: string) {
    this.loginAttemptsService.assertNotLocked(dto.email, ipAddress);

    try {
      const candidate = await this.candidatesService.validateCredentials(dto.email, dto.password);
      this.loginAttemptsService.clear(dto.email, ipAddress);

      return this.buildAuthResponse(candidate);
    } catch (error) {
      this.loginAttemptsService.recordFailure(dto.email, ipAddress);
      throw error;
    }
  }

  private buildAuthResponse(candidate: Candidate) {
    const payload = {
      sub: candidate.id,
      email: candidate.email,
      name: candidate.name,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      candidate: toSafeCandidate(candidate),
    };
  }
}
