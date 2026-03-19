import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class StudentsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(createStudentData: any) {
    const db = this.firebaseService.getFirestore();
    
    const docRef = await db.collection('students').add(createStudentData);
    
    return { 
      id: docRef.id, 
      ...createStudentData, 
      message: 'Aluno cadastrado com sucesso!' 
    };
  }

  async findAll() {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('students').get();

    const students: any[] = [];
    snapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });

    return students;
  }
}