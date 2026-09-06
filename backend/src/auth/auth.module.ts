import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { LoginAttemptsService } from './login-attempts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization]),
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET || 'assessment-cloud-secret-dev';

        if (process.env.NODE_ENV === 'production' && secret === 'assessment-cloud-secret-dev') {
          throw new Error('JWT_SECRET debe configurarse en producción');
        }

        return {
          secret,
          signOptions: {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h',
            issuer: process.env.JWT_ISSUER || 'assessment-cloud-api',
            audience: process.env.JWT_AUDIENCE || 'assessment-cloud-org',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, LoginAttemptsService],
  exports: [RolesGuard, JwtModule],
})
export class AuthModule {}
