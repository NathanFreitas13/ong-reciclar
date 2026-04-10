import { Injectable, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateClassDto } from './create-class.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(createClassDto: CreateClassDto) {
    try {
      const db = this.firebaseService.getFirestore();
      
      const existing = await db.collection('classes')
        .where('name', '==', createClassDto.name)
        .where('shift', '==', createClassDto.shift)
        .get();

      if (!existing.empty) {
        throw new ConflictException('Já existe uma turma com este nome neste turno.');
      }

      const newClass = {
        name: createClassDto.name,
        shift: createClassDto.shift,
        createdAt: new Date().toISOString(),
      };

      const docRef = await db.collection('classes').add(newClass);

      return {
        message: 'Turma criada com sucesso!',
        id: docRef.id,
        ...newClass
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Erro ao criar a turma no banco de dados.');
    }
  }

  async findAll() {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection('classes').orderBy('name', 'asc').get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar a lista de turmas.');
    }
  }

  async getClassesSummary() {
    try {
      const db = this.firebaseService.getFirestore();

      const [classesSnap, studentsSnap, attendancesSnap, absencesSnap] = await Promise.all([
        db.collection('classes').get(),
        db.collection('students').where('status', 'in', ['active', 'alert']).get(),
        db.collection('attendances').where('type', '==', 'entry').get(),
        db.collection('absences').where('status', '==', 'Não abonada').get()
      ]);

      const classesMap = new Map<string, any>();

      classesSnap.forEach(doc => {
        const cls = doc.data() as any;
        const groupKey = `${cls.name}_${cls.shift}`;
        classesMap.set(groupKey, {
          classId: doc.id,
          className: cls.name,
          shift: cls.shift,
          totalStudents: 0,
          totalPresences: 0,
          totalAbsences: 0,
        });
      });

      studentsSnap.forEach(doc => {
        const student = doc.data() as any;
        const groupKey = `${student.className}_${student.shift}`;
        if (classesMap.has(groupKey)) classesMap.get(groupKey).totalStudents += 1;
      });

      attendancesSnap.forEach(doc => {
        const data = doc.data() as any;
        const groupKey = `${data.className}_${data.shift}`;
        if (classesMap.has(groupKey)) classesMap.get(groupKey).totalPresences += 1;
      });

      absencesSnap.forEach(doc => {
        const data = doc.data() as any;
        const groupKey = `${data.className}_${data.shift}`;
        if (classesMap.has(groupKey)) classesMap.get(groupKey).totalAbsences += 1;
      });

      const result = Array.from(classesMap.values()).map(cls => {
        const totalEvents = cls.totalPresences + cls.totalAbsences;
        const frequency = totalEvents === 0 ? 100 : Math.round((cls.totalPresences / totalEvents) * 100);
        return { ...cls, frequency: `${frequency}%` };
      });

      return result.sort((a, b) => {
        if (a.className === b.className) return a.shift.localeCompare(b.shift);
        return a.className.localeCompare(b.className);
      });

    } catch (error) {
      throw new InternalServerErrorException('Falha ao processar os dados das turmas.');
    }
  }
}