import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async register(createAttendanceDto: CreateAttendanceDto) {
    try {
      const db = this.firebaseService.getFirestore();

      const studentRef = db.collection('students').doc(createAttendanceDto.studentId);
      const studentSnap = await studentRef.get();

      if (!studentSnap.exists) {
        throw new NotFoundException('QR Code inválido: Aluno não encontrado no sistema.');
      }

      const studentData = studentSnap.data() as any;

      if (studentData.status !== 'ativo') {
        throw new BadRequestException('Acesso Negado: Este aluno está inativo.');
      }

      const attendanceRecord = {
        studentId: createAttendanceDto.studentId,
        studentName: studentData.fullName,
        className: studentData.className,
        type: createAttendanceDto.type,
        timestamp: new Date().toISOString(),
      };

      await db.collection('attendances').add(attendanceRecord);

      const acao = createAttendanceDto.type === 'entry' ? 'Entrada' : 'Saída';
      
      return {
        message: `${acao} de ${studentData.fullName} registrada com sucesso!`,
        data: attendanceRecord
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Erro ao registrar presença:', error);
      throw new InternalServerErrorException('Falha no servidor ao registrar a presença.');
    }
  }

  async findAll() {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection('attendances').orderBy('timestamp', 'desc').get();
      
      const attendances: any[] = [];
      snapshot.forEach(doc => {
        attendances.push({ id: doc.id, ...doc.data() });
      });

      return attendances;
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar o histórico de presenças.');
    }
  }

  async processDailyAbsences() {
    try {

      const currentday = new Date().getDay();
      if (currentday === 0 || currentday === 6) {
        return { message: 'O robô de faltas não roda aos sábados e domingos.' };
       }

      const db = this.firebaseService.getFirestore();
      
      const today = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split(' ')[0];

      const attendancesSnap = await db.collection('attendances').get();
      const presentStudentIds = new Set(); 
      
      attendancesSnap.forEach(doc => {
        const data = doc.data() as any;
        if (data.timestamp && data.timestamp.startsWith(today) && data.type === 'entry') {
          presentStudentIds.add(data.studentId);
        }
      });

      const studentsSnap = await db.collection('students').where('status', 'in', ['ativo', 'alerta']).get();

      let faltasAplicadas = 0;

      for (const doc of studentsSnap.docs) {
        const studentId = doc.id;
        
        if (!presentStudentIds.has(studentId)) {
          const studentData = doc.data() as any;

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
          
          if (newAbsences >= 2 && newStatus !== 'inativo') {
            newStatus = 'alerta'; 
          }

          await db.collection('students').doc(studentId).update({
            absences: newAbsences,
            status: newStatus
          });
          
          faltasAplicadas++;
        }
      }

      return { 
        message: `Robô rodou com sucesso! Data: ${today} ${faltasAplicadas} faltas foram aplicadas, e registradas no histórico.` 
      };

    } catch (error) {
      console.error('Erro no robô de faltas:', error);
      throw new InternalServerErrorException('Falha ao processar faltas diárias.');
    }
  }

  async getAbsenceHistory() {
    try {
      const db = this.firebaseService.getFirestore();
      const absencesSnap = await db.collection('absences').orderBy('createdAt', 'desc').get();
      const history: any[] = [];

      absencesSnap.forEach(doc => {
        history.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return history;
    } catch (error) {
      console.error('Erro ao buscar histórico de faltas:', error);
      throw new InternalServerErrorException('Falha ao buscar o histórico de faltas.');
    }
  }

  async justifyAbsence(absenceId: string) {
    try {
      const db = this.firebaseService.getFirestore();
      
      const absenceRef = db.collection('absences').doc(absenceId);
      const absenceSnap = await absenceRef.get();

      if (!absenceSnap.exists) {
        throw new NotFoundException('Recibo de falta não encontrado.');
      }

      const absenceData = absenceSnap.data() as any;

      if (absenceData.status === 'Abonada') {
        return { message: 'Esta falta já foi abonada anteriormente.' };
      }

      await absenceRef.update({
        status: 'Abonada',
        justifiedAt: new Date().toISOString()
      });

      const studentRef = db.collection('students').doc(absenceData.studentId);
      const studentSnap = await studentRef.get();
      
      if (studentSnap.exists) {
        const studentData = studentSnap.data() as any;
        const currentAbsences = studentData.absences || 0;
        
        const newAbsences = Math.max(0, currentAbsences - 1); 
        let newStatus = studentData.status;

        if (newAbsences < 2 && newStatus === 'alerta') {
          newStatus = 'ativo';
        }

        await studentRef.update({
          absences: newAbsences,
          status: newStatus
        });
      }

      return { 
        message: `Falta de ${absenceData.studentName} abonada com sucesso!`,
        status: 'Abonada'
      };

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao abonar a falta.');
    }
  }
}