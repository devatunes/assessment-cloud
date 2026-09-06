import { UserRole } from '../users/entities/user.entity';

// Shape de req.user para las rutas de organización (JwtAuthGuard/JwtStrategy).
// No confundir con AuthenticatedCandidate (src/candidate-auth/), que es un
// sistema de cuentas completamente separado.
export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
}
