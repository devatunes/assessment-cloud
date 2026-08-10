import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth-user.interface';
import { UserRole } from './entities/user.entity';
import { UsersService } from './users.service';
import { PaginationQueryDto } from '../common/pagination-query.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lista los usuarios de la organización (solo admin)' })
  async list(@Query() query: PaginationQueryDto, @CurrentUser() currentUser: AuthenticatedUser) {
    const result = await this.usersService.listByOrganization(currentUser.organizationId, query);

    // Nunca exponer passwordHash/activationToken en la respuesta.
    return {
      ...result,
      items: result.items.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
    };
  }
}
