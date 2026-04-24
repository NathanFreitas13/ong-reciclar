import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class DashboardService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getStudentsMetrics() {
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

      return result.sort((a, b) => a.fullName.localeCompare(b.fullName));

    } catch (error) {
      console.error('Erro ao gerar métricas do dashboard:', error);
      throw new InternalServerErrorException('Falha ao processar os dados do dashboard.');
    }
  }
}