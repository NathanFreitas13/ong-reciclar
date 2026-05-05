import { Injectable, InternalServerErrorException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async update(classId: string, updateData: any) {
    try {
      const db = this.firebaseService.getFirestore();
      const classRef = db.collection('classes').doc(classId);
      const classSnap = await classRef.get();

      if (!classSnap.exists) {
        throw new NotFoundException('Turma não encontrada.');
      }

      const currentClass = classSnap.data() as any;
      const oldName = currentClass.name;
      const oldShift = currentClass.shift;

      const newName = updateData.name || oldName;
      const newShift = updateData.shift || oldShift;

      if (newName !== oldName || newShift !== oldShift) {
        const checkDuplicate = await db.collection('classes')
          .where('name', '==', newName)
          .where('shift', '==', newShift)
          .get();

        if (!checkDuplicate.empty) {
          throw new ConflictException(`A turma "${newName}" no turno "${newShift}" já existe.`);
        }
      }

      const batch = db.batch();

      batch.update(classRef, {
        name: newName,
        shift: newShift,
        updatedAt: new Date().toISOString()
      });

      if (newName !== oldName || newShift !== oldShift) {
        const studentsSnap = await db.collection('students')
          .where('className', '==', oldName)
          .where('shift', '==', oldShift)
          .get();

        studentsSnap.forEach(studentDoc => {
          batch.update(studentDoc.ref, {
            className: newName,
            shift: newShift,
            updatedAt: new Date().toISOString()
          });
        });
      }

      await batch.commit();

      return {
        message: 'Turma (e alunos vinculados) atualizada com sucesso!'
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      console.error('Erro ao atualizar turma:', error);
      throw new InternalServerErrorException('Não foi possível atualizar a turma.');
    }
  }

  async remove(classId: string) {
    try {
      const db = this.firebaseService.getFirestore();
      const classRef = db.collection('classes').doc(classId);
      const classSnap = await classRef.get();

      if (!classSnap.exists) {
        throw new NotFoundException('Turma não encontrada.');
      }

      const classData = classSnap.data() as any;

      const studentsSnap = await db.collection('students')
        .where('className', '==', classData.name)
        .where('shift', '==', classData.shift)
        .get();

      if (!studentsSnap.empty) {
        throw new BadRequestException(
          'Não é possível excluir uma turma com alunos cadastrados.'
        );
      }

      await classRef.delete();

      return { message: 'Turma excluída com sucesso!' };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      console.error('Erro ao deletar turma:', error);
      throw new InternalServerErrorException('Não foi possível excluir a turma.');
    }
  }
}