import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Candidate } from './entities/candidate.entity';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
  ) {}

  findByEmail(email: string): Promise<Candidate | null> {
    return this.candidateRepository
      .createQueryBuilder('candidate')
      .where('LOWER(candidate.email) = LOWER(:email)', { email })
      .getOne();
  }

  findById(id: string): Promise<Candidate | null> {
    return this.candidateRepository.findOne({ where: { id } });
  }

  async create(params: { name: string; email: string; password: string }): Promise<Candidate> {
    const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);

    return this.candidateRepository.save(
      this.candidateRepository.create({
        name: params.name,
        email: params.email,
        passwordHash,
      }),
    );
  }

  async validateCredentials(email: string, password: string): Promise<Candidate> {
    const candidate = await this.findByEmail(email);

    if (!candidate) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const matches = await bcrypt.compare(password, candidate.passwordHash);

    if (!matches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return candidate;
  }
}
