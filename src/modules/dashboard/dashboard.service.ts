import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class DashboardService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getStudentsMetrics(page?: number, limit?: number, search?: string, className?: string, shift?: string) {
    try {
      const db = this.firebaseService.getFirestore();

      const [studentsSnap, attendancesSnap, absencesSnap] = await Promise.all([
        db.collection('students').where('status', 'in', ['ativo', 'alerta']).get(),
        db.collection('attendances').where('type', '==', 'entry').get(),
        db.collection('absences').get() 
      ]);

      const studentsMap = new Map<string, any>();

      studentsSnap.forEach(doc => {
        const student = doc.data() as any;
        studentsMap.set(doc.id, {
          id: doc.id,
          qrcodeId: doc.id,
          fullName: student.fullName,
          className: student.className,
          shift: student.shift,
          status: student.status,
          presences: 0,
          absences: 0,
          justified: 0,
          frequency: '100.00%',
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

      const result = Array.from(studentsMap.values()).map(student => {
        const totalEvents = student.presences + student.absences; 
        const frequency = totalEvents === 0 ? 100 : (student.presences / totalEvents) * 100;

        return {
          ...student,
          frequency: `${frequency.toFixed(2)}%`
        };
      });

      let sortedResult = result.sort((a,b) => a.fullName.localeCompare(b.fullName));

      if (search) {
        const searchLower = search.toLowerCase();
        sortedResult = sortedResult.filter(student =>
          student.fullName.toLowerCase().includes(searchLower)
        );
      }

      if (className) {
        sortedResult = sortedResult.filter(student => student.className === className);
      }

      if (shift) {
        sortedResult = sortedResult.filter(student => student.shift === shift);
      }

      if (!page || !limit) {
        return sortedResult;
      }

      const totalItems = sortedResult.length;
      const startIndex = (page - 1) * limit;
      const paginatedData = sortedResult.slice(startIndex, startIndex + limit);

      return {
        data: paginatedData,
        meta: {
          totalItems,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page
        }
      };

    } catch (error) {
      console.error('Erro ao gerar métricas do dashboard:', error);
      throw new InternalServerErrorException('Falha ao processar os dados do dashboard.');
    }
  }

  async exportStudentsToExcel() {
    try {
      const students = await this.getStudentsMetrics() as any[];

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Frequência de Alunos');

      worksheet.columns = [
        { header: 'Nome do Aluno', key: 'fullName', width: 35 },
        { header: 'Turma', key: 'className', width: 20 },
        { header: 'Turno', key: 'shift', width: 15 },
        { header: 'Presenças', key: 'presences', width: 15 },
        { header: 'Faltas', key: 'absences', width: 15 },
        { header: 'Abonadas', key: 'justified', width: 15 },
        { header: 'Frequência', key: 'frequency', width: 20 },
        { header: 'Status', key: 'status', width: 20 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D47A1' }
      };
      worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.addRows(students);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.getCell('presences').alignment = { horizontal: 'center' };
          row.getCell('absences').alignment = { horizontal: 'center' };
          row.getCell('justified').alignment = { horizontal: 'center' };
          row.getCell('frequency').alignment = { horizontal: 'center' };
          row.getCell('status').alignment = { horizontal: 'center' };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;

    } catch (error) {
      console.error('Erro ao gerar o Excel:', error);
      throw new InternalServerErrorException('Falha ao gerar o arquivo de exportação.');
    }
  }
}