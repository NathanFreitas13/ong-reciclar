import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Auth } from 'firebase-admin/auth';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly firebaseAuth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Token de autenticação não fornecido ou inválido (esperado: Bearer <token>)',
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(idToken);
      // Injetamos o decodedToken na request para uso em outros lugares (ex: decorators, controllers)
      request.user = decodedToken;
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        'Token de autenticação inválido ou expirado',
      );
    }
  }
}
