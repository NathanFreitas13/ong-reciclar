import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';

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
    const adminData = adminDoc.data();

    if (adminData.password !== pass) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    return {
      message: 'Login realizado com sucesso!',
      admin: {
        id: adminDoc.id,
        name: adminData.name,
        email: adminData.email,
        role: adminData.role,
      }
    };
  }
}