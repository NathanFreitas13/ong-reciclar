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

      const [classesSnap, studentsSnap] = await Promise.all([
        db.collection('classes').get(),
        db.collection('students').where('status', 'in', ['ativo', 'alerta']).get(),
      ]);

      const classesMap = new Map<string, any>();

      classesSnap.forEach(doc => {
        const cls = doc.data() as any;
        const groupKey = `${cls.name}_${cls.shift}`;
        classesMap.set(groupKey, {
          classId: doc.id,
          className: cls.name,
          shift: cls.shift,
          totalStudents: 0
        });
      });

      studentsSnap.forEach(doc => {
        const student = doc.data() as any;
        const groupKey = `${student.className}_${student.shift}`;
        if (classesMap.has(groupKey)) classesMap.get(groupKey).totalStudents += 1;
      });

      const result = Array.from(classesMap.values());

      return result.sort((a, b) => {
        if (a.className === b.className) return a.shift.localeCompare(b.shift);
        return a.className.localeCompare(b.className);
      });

    } catch (error) {
      throw new InternalServerErrorException('Falha ao processar os dados das turmas.');
    }
  }
}