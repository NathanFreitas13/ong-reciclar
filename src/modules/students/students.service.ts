import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

  async addAbsence(studentId: string) {
    try {
      const db = this.firebaseService.getFirestore();
      const studentRef = db.collection('students').doc(studentId);
      const studentSnap = await studentRef.get();

      if (!studentSnap.exists) {
        throw new NotFoundException('Aluno não encontrado no sistema.');
      }

      const studentData = studentSnap.data() as any;
      const today = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split(',')[0];

      await db.collection('absences').add({
        studentId: studentId,
        studentName: studentData.fullName,
        className: studentData.className || 'Sem turma',
        date: today,
        status: 'Não abonada',
        createdAt: new Date().toISOString()
      });
      
      const newAbsences = (studentData.absences || 0) + 1;
      let newStatus = studentData.status;

      if (newAbsences >= 2 && newStatus !== 'inactive') {
        newStatus = 'alert';
      }

      await studentRef.update({
        absences: newAbsences,
        status: newStatus
      });

      return {
        message: `Falta registrada com sucesso para ${studentData.fullName}.`,
        newAbsences: newAbsences,
        newStatus: newStatus
      };

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao registrar a falta manual.');
    }
  }

  async removeAbsence(studentId: string) {
    try {
      const db = this.firebaseService.getFirestore();
      const studentRef = db.collection('students').doc(studentId);
      const studentSnap = await studentRef.get();

      if (!studentSnap.exists) {
        throw new NotFoundException('Aluno não encontrado no sistema.');
      }

      const studentData = studentSnap.data() as any;
      const currentAbsences = studentData.absences || 0;

      if (currentAbsences <= 0) {
        return {
          message: `O aluno ${studentData.fullName} já está com 0 faltas.`,
          newAbsences: 0,
          newStatus: studentData.status
        };
      }
      
      const newAbsences = currentAbsences - 1;
      let newStatus = studentData.status;

      if (newAbsences < 2 && newStatus === 'alert') {
        newStatus = 'active';
      }

      await studentRef.update({
        absences: newAbsences,
        status: newStatus
      });

      return {
        message: `Falta removida com sucesso de ${studentData.fullName} (Atestado/Justificativa).`,
        newAbsences: newAbsences,
        newStatus: newStatus
      };

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao remover a falta.');
    }
  }
}