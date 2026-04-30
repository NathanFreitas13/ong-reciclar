import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class StudentsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(createStudentDto: CreateStudentDto) {
    try {
      const db = this.firebaseService.getFirestore();

      const classRef = await db.collection('classes')
        .where('name', '==', createStudentDto.className)
        .where('shift', '==', createStudentDto.shift)
        .get();

        if (classRef.empty) {
          throw new NotFoundException (`Turma "${createStudentDto.className}" com turno "${createStudentDto.shift}" não encontrada. Por favor, cadastre a turma antes de cadastrar o aluno.`);
        }
      
      const newStudent = {
        fullName: createStudentDto.fullName,
        className: createStudentDto.className,
        shift: createStudentDto.shift,
        expirationYear: createStudentDto.expirationYear,
        status: 'ativo',
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

  async updateStatus(studentId: string, newStatus: 'ativo' | 'inativo') {
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
      
      const [studentsSnap, attendancesSnap, absencesSnap] = await Promise.all([
        db.collection('students').get(),
        db.collection('attendances').where('type', '==', 'entry').get(),
        db.collection('absences').get()
      ]);

      const studentsMap = new Map<string, any>();

      studentsSnap.forEach(doc => {
        const student = doc.data() as any;
        studentsMap.set(doc.id, {
          id: doc.id,
          qrcodeId: doc.id,
          ...student,
          presences: 0,
          absences: 0,
          justified: 0,
          frequency: '100.00%'
        });
      });

      attendancesSnap.forEach(doc => {
        const data = doc.data() as any;
        if (studentsMap.has(data.studentId)) {
          studentsMap.get(data.studentId).presences += 1;
        }
      });

      absencesSnap.forEach(doc => {
        const data = doc.data() as any;
          if (studentsMap.has(data.studentId)) {
            if (data.status === 'Abonada') {
              studentsMap.get(data.studentId).justified += 1;
            } else {
              studentsMap.get(data.studentId).absences += 1;
            }
          }
      });

      const students = Array.from(studentsMap.values()).map(student => {
        const totalEvents = student.presences + student.absences;
        const frequency = totalEvents === 0 ? 100 : (student.presences / totalEvents) * 100;

      return {
        ...student,
        frequency: `${frequency.toFixed(2)}%`
      };
    });

    return students.sort((a, b) => a.fullName.localeCompare(b.fullName));

  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    throw new InternalServerErrorException('Não foi possível buscar os alunos.');
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
        shift: studentData.shift || 'Sem turno',
        date: today,
        status: 'Não abonada',
        createdAt: new Date().toISOString()
      });
      
      const newAbsences = (studentData.absences || 0) + 1;
      let newStatus = studentData.status;

      if (newAbsences >= 2 && newStatus !== 'inativo') {
        newStatus = 'alerta';
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

      if (newAbsences < 2 && newStatus === 'alerta') {
        newStatus = 'ativo';
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

  async update(studentId: string, updateStudentDto: any) { 
    try {
      const db = this.firebaseService.getFirestore();
      const studentRef = db.collection('students').doc(studentId);
      const studentSnap = await studentRef.get();

      if (!studentSnap.exists) {
        throw new NotFoundException('Aluno não encontrado no sistema.');
      }

      const currentStudent = studentSnap.data() as any;

      const { fullName, expirationYear, className, shift } = updateStudentDto;

      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (expirationYear) updateData.expirationYear = expirationYear;
      if (className) updateData.className = className;
      if (shift) updateData.shift = shift;

      if (className || shift) {
        const newClassName = className || currentStudent.className;
        const newShift = shift || currentStudent.shift;

        const classRef = await db.collection('classes')
          .where('name', '==', newClassName)
          .where('shift', '==', newShift)
          .get();

        if (classRef.empty) {
          throw new NotFoundException(`Turma "${newClassName}" com turno "${newShift}" não encontrada. Cadastre a turma antes.`);
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { message: 'Nenhum dado válido enviado para atualização.' };
      }

      updateData.updatedAt = new Date().toISOString();
      await studentRef.update(updateData);

      return {
        message: 'Dados do aluno atualizados com sucesso!'
      };

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao atualizar aluno:', error);
      throw new InternalServerErrorException('Não foi possível atualizar os dados do aluno.');
    }
  }
}