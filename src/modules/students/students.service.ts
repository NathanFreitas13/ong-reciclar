import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class StudentsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(createStudentDto: CreateStudentDto) {
    try {
      const db = this.firebaseService.getFirestore();
      
      const newStudent = {
        fullName: createStudentDto.fullName,
        className: createStudentDto.className,
        expirationYear: createStudentDto.expirationYear,
        status: 'active',
        absences: 0,
        createdAt: new Date().toISOString(),
      };

      const docRef = await db.collection('students').add(newStudent);

      return {
        message: 'Aluno cadastrado com sucesso!',
        qrCodeId: docRef.id, 
        data: newStudent
      };
    } catch (error) {
      console.error('Erro ao cadastrar aluno:', error);
      throw new InternalServerErrorException('Não foi possível cadastrar o aluno.');
    }
  }

  async updateStatus(studentId: string, newStatus: 'active' | 'inactive') {
    try {
      const db = this.firebaseService.getFirestore();
      
      await db.collection('students').doc(studentId).update({
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      return { 
        message: `Status do aluno atualizado com sucesso para: ${newStatus}` 
      };
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw new InternalServerErrorException('Não foi possível atualizar o status do aluno.');
    }
  }

  async findAll() {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection('students').get();
      
      const students: any[] = [];
      snapshot.forEach(doc => {
        students.push({ id: doc.id, ...doc.data() });
      });

      return students;
    } catch (error) {
      throw new InternalServerErrorException('Não foi possível listar os alunos.');
    }
  }
}