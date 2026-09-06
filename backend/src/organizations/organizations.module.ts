import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';

// Módulo delgado: por ahora no hay endpoints propios de administración de
// organización (nombre, facturación, etc.) — solo exporta el repositorio
// para que AuthModule pueda crear la Organization al registrar la cuenta.
@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  exports: [TypeOrmModule],
})
export class OrganizationsModule {}
