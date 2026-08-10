import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PaginatedResult, paginate } from '../common/paginated-result';

const ACTIVATION_TOKEN_TTL_HOURS = 72;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async listByOrganization(organizationId: string, query: PaginationQueryDto): Promise<PaginatedResult<User>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await this.userRepository.findAndCount({
      where: { organizationId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return paginate(items, total, page, pageSize);
  }

  async createOrganizationAdmin(params: {
    organizationId: string;
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);

    return this.userRepository.save(
      this.userRepository.create({
        organizationId: params.organizationId,
        name: params.name,
        email: params.email,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
  }

  // Crea la fila del invitado en estado PENDING_ACTIVATION, sin contraseña
  // todavía; el token se lo lleva el frontend para armar el link de
  // activación (no hay envío de email real, ver AuthService.inviteTeammate).
  async createInvitedUser(params: {
    organizationId: string;
    name: string;
    email: string;
    role: UserRole;
  }): Promise<User> {
    const activationToken = randomBytes(32).toString('hex');
    const activationTokenExpiresAt = new Date(
      Date.now() + ACTIVATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );

    return this.userRepository.save(
      this.userRepository.create({
        organizationId: params.organizationId,
        name: params.name,
        email: params.email,
        role: params.role,
        status: UserStatus.PENDING_ACTIVATION,
        activationToken,
        activationTokenExpiresAt,
      }),
    );
  }

  async findByValidActivationToken(token: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { activationToken: token } });

    if (!user) return null;
    if (!user.activationTokenExpiresAt || user.activationTokenExpiresAt < new Date()) {
      return null;
    }

    return user;
  }

  async activate(user: User, password: string): Promise<User> {
    user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.status = UserStatus.ACTIVE;
    user.activationToken = null;
    user.activationTokenExpiresAt = null;

    return this.userRepository.save(user);
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.findByEmail(email);

    if (!user || user.status !== UserStatus.ACTIVE || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);

    if (!matches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }
}
