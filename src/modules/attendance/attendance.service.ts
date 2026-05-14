import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { FirebaseService } from '../../firebase/firebase.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AttendanceService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async register(createAttendanceDto: CreateAttendanceDto) {
    try {
      const db = this.firebaseService.getFirestore();

      const studentRef = db
        .collection('students')
        .doc(createAttendanceDto.studentId);
      const studentSnap = await studentRef.get();

      if (!studentSnap.exists) {
        throw new NotFoundException(
          'QR Code inválido: Aluno não encontrado no sistema.',
        );
      }

      const studentData = studentSnap.data() as any;

      if (studentData.status === 'inativo') {
        throw new BadRequestException(
          'Acesso Negado: Este aluno está inativo.',
        );
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
        data: attendanceRecord,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Erro ao registrar presença:', error);
      throw new InternalServerErrorException(
        'Falha no servidor ao registrar a presença.',
      );
    }
  }

  async findAll() {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection('attendances')
        .orderBy('timestamp', 'desc')
        .get();

      const attendances: any[] = [];
      snapshot.forEach((doc) => {
        attendances.push({ id: doc.id, ...doc.data() });
      });

      return attendances;
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao buscar o histórico de presenças.',
      );
    }
  }

  async filterAbsences(
    studentId?: string,
    className?: string,
    shift?: string,
    status?: string,
  ) {
    const text = `Filtro recebido - studentId: ${studentId}, className: ${className}, shift: ${shift}, status: ${status}`;

    return text;
  }

  async processDailyAbsences() {
    try {
      const currentday = new Date().getDay();
      if (currentday === 0 || currentday === 6) {
        return { message: 'O robô de faltas não roda aos sábados e domingos.' };
      }

      const db = this.firebaseService.getFirestore();

      const today = new Date()
        .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        .split(' ')[0];

      const attendancesSnap = await db.collection('attendances').get();
      const presentStudentIds = new Set();

      attendancesSnap.forEach((doc) => {
        const data = doc.data() as any;
        if (
          data.timestamp &&
          data.timestamp.startsWith(today) &&
          data.type === 'entry'
        ) {
          presentStudentIds.add(data.studentId);
        }
      });

      const studentsSnap = await db
        .collection('students')
        .where('status', 'in', ['ativo', 'alerta'])
        .get();

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
            createdAt: new Date().toISOString(),
          });

          const newAbsences = (studentData.absences || 0) + 1;
          let newStatus = studentData.status;

          if (newAbsences >= 2 && newStatus !== 'inativo') {
            newStatus = 'alerta';
          }

          await db.collection('students').doc(studentId).update({
            absences: newAbsences,
            status: newStatus,
          });

          faltasAplicadas++;
        }
      }

      return {
        message: `Robô rodou com sucesso! Data: ${today} ${faltasAplicadas} faltas foram aplicadas, e registradas no histórico.`,
      };
    } catch (error) {
      console.error('Erro no robô de faltas:', error);
      throw new InternalServerErrorException(
        'Falha ao processar faltas diárias.',
      );
    }
  }

  async getAbsenceHistory(page: number = 1, qttd: number = 500) {
    try {
      const db = this.firebaseService.getFirestore();
      const limit = qttd;

      const totalSnap = await db.collection('absences').count().get();
      const totalItems = totalSnap.data().count;

      let query = db
        .collection('absences')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (page > 1) {
        const offset = (page - 1) * limit;
        query = query.offset(offset);
      }

      const absencesSnap = await query.get();
      const data = absencesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        data,
        meta: {
          totalItems,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
        },
      };
    } catch (error) {
      console.error('Erro ao buscar histórico de faltas:', error);
      throw new InternalServerErrorException(
        'Falha ao buscar o histórico de faltas.',
      );
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
        justifiedAt: new Date().toISOString(),
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
          status: newStatus,
        });
      }

      return {
        message: `Falta de ${absenceData.studentName} abonada com sucesso!`,
        status: 'Abonada',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao abonar a falta.');
    }
  }

  async getHistoryFouls() {
    try {
      const db = this.firebaseService.getFirestore();

      const [attendancesSnap, absencesSnap] = await Promise.all([
        db.collection('attendances').where('type', '==', 'entry').get(),
        db.collection('absences').get(),
      ]);

      const totalPresences = attendancesSnap.size;

      let justifyedCount = 0;
      let unjustifyedCount = 0;

      absencesSnap.forEach((doc) => {
        const data = doc.data() as any;
        if (data.status === 'Abonada') {
          justifyedCount += 1;
        } else {
          unjustifyedCount += 1;
        }
      });

      return {
        presences: totalPresences,
        absence: justifyedCount + unjustifyedCount,
        justifyed: justifyedCount,
        unjustifyed: unjustifyedCount,
      };
    } catch (error) {
      console.error('Erro ao gerar resumo do histórico de faltas:', error);
      throw new InternalServerErrorException(
        'Falha ao calcular o resumo de faltas e presenças.',
      );
    }
  }

  async exportHistoryToExcel() {
    try {
      const db = this.firebaseService.getFirestore();

      const snapshot = await db
        .collection('absences')
        .orderBy('date', 'desc')
        .get();
      const history = snapshot.docs.map((doc) => doc.data());

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Histórico de Faltas');

      worksheet.columns = [
        { header: 'Data', key: 'date', width: 15 },
        { header: 'Nome do Aluno', key: 'studentName', width: 35 },
        { header: 'Turma', key: 'className', width: 20 },
        { header: 'Turno', key: 'shift', width: 15 },
        { header: 'Status da Falta', key: 'status', width: 20 },
        { header: 'Registrado em', key: 'createdAt', width: 25 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB71C1C' },
      };

      worksheet.addRows(history);

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Erro ao exportar histórico:', error);
      throw new InternalServerErrorException(
        'Falha ao gerar excel do histórico.',
      );
    }
  }
}
