import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginAttemptsService } from './login-attempts.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginDto } from './dto/login.dto';
import { InviteTeammateDto } from './dto/invite-teammate.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

const DEFAULT_ORGANIZATION_NAME = 'Organización por defecto';

function toSafeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly loginAttemptsService: LoginAttemptsService,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  // Da acceso a la data ya sembrada (preguntas/assessment de ejemplo, ver
  // SeedQuestions1738800000001) creando un admin en la "Organización por
  // defecto" que la migración 1738800000003 crea y le hace backfill. Sin
  // esto nadie podría loguearse para verla.
  async onModuleInit(): Promise<void> {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      this.logger.warn(
        'SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD no configuradas: se omite el bootstrap del admin por defecto',
      );
      return;
    }

    const defaultOrganization = await this.organizationRepository.findOne({
      where: { name: DEFAULT_ORGANIZATION_NAME },
    });

    if (!defaultOrganization) return;

    const existing = await this.usersService.findByEmail(email);
    if (existing) return;

    await this.usersService.createOrganizationAdmin({
      organizationId: defaultOrganization.id,
      name: 'Admin',
      email,
      password,
    });
    this.logger.log(`Admin por defecto creado: ${email}`);
  }

  async registerOrganization(dto: RegisterOrganizationDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este correo');
    }

    const organization = await this.organizationRepository.save(
      this.organizationRepository.create({ name: dto.organizationName }),
    );

    const user = await this.usersService.createOrganizationAdmin({
      organizationId: organization.id,
      name: dto.adminName,
      email: dto.email,
      password: dto.password,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto, ipAddress: string) {
    this.loginAttemptsService.assertNotLocked(dto.email, ipAddress);

    try {
      const user = await this.usersService.validateCredentials(dto.email, dto.password);
      this.loginAttemptsService.clear(dto.email, ipAddress);

      return this.buildAuthResponse(user);
    } catch (error) {
      this.loginAttemptsService.recordFailure(dto.email, ipAddress);
      throw error;
    }
  }

  // Solo ADMIN (verificado por el guard del controller). No hay envío de
  // email real: retorna el token para que el frontend arme el link de
  // activación y el admin lo copie/envíe manualmente.
  async inviteTeammate(inviterOrganizationId: string, dto: InviteTeammateDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este correo');
    }

    const user = await this.usersService.createInvitedUser({
      organizationId: inviterOrganizationId,
      name: dto.name,
      email: dto.email,
      role: dto.role,
    });

    return { activationToken: user.activationToken };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const user = await this.usersService.findByValidActivationToken(dto.token);

    if (!user) {
      throw new BadRequestException('El link de activación es inválido o expiró');
    }

    const activated = await this.usersService.activate(user, dto.password);

    return this.buildAuthResponse(activated);
  }

  private buildAuthResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: toSafeUser(user),
    };
  }
}
