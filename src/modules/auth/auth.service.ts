import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async login(email: string, pass: string) {
    const db = this.firebaseService.getFirestore();
    
    const adminsRef = db.collection('admins');
    const snapshot = await adminsRef.where('email', '==', email).get();

    if (snapshot.empty) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const adminDoc = snapshot.docs[0];
    const adminData = adminDoc.data()

    const FIREBASE_API_KEY = "AIzaSyD7itKJBk3Rl6xkObav4RbxeHOzW3y8l54";
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: pass,
          returnSecureToken: true,
        }),
      });

      if (!response.ok) {
        throw new UnauthorizedException('E-mail ou senha incorretos.');
      }

      const authData = await response.json();

      return {
        message: 'Login realizado com sucesso!',
        accessToken: authData.idToken,
        admin: {
          id: adminDoc.id,
          name: adminData.name,
          email: adminData.email,
          role: adminData.role,
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('Erro na autenticação:', error);
      throw new InternalServerErrorException('Ocorreu um erro durante a autenticação. Tente novamente mais tarde.');
    }
  }
}