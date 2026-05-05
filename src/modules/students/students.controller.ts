import { Controller, Post, Get, Patch, Body, Param, Put, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guard';

@ApiTags('Students')
@UseGuards(AuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os alunos' })
  @ApiResponse({ status: 200, description: 'Lista de alunos retornada com sucesso.' })
  findAll() {
    return this.studentsService.findAll();
  }
  
  @Post()
  @ApiOperation({ summary: 'Cadastra um novo aluno' })
  @ApiResponse({ status: 201, description: 'Aluno cadastrado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Altera o status do aluno (ativo/inativo)' })
  @ApiParam({ name: 'id', description: 'ID do aluno no banco de dados' })
  @ApiResponse({ status: 200, description: 'Status do aluno atualizado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado.' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'ativo' | 'inativo',
  ) {
    return this.studentsService.updateStatus(id, status);
  }

  @Patch(':id/absence')
  @ApiOperation({ summary: 'Adiciona uma falta manualmente ao aluno' })
  @ApiParam({ name: 'id', description: 'ID do aluno no banco de dados' })
  @ApiResponse({ status: 200, description: 'Falta registrada com sucesso e histórico gerado.' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado.' })
  addAbsence(@Param('id') id: string) {
    return this.studentsService.addAbsence(id);
  }

  @Patch(':id/remove-absence')
  @ApiOperation({ summary: 'Remove uma falta do aluno' })
  @ApiParam({ name: 'id', description: 'ID do aluno no banco de dados' })
  @ApiResponse({ status: 200, description: 'Falta removida com sucesso.' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado.' })
  removeAbsence(@Param('id') id: string) {
    return this.studentsService.removeAbsence(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza dados cadastrais do aluno (nome, turma, turno e validade)' })
  update(@Param('id') id: string, @Body() updateStudentDto: any) {
    return this.studentsService.update(id, updateStudentDto);
  }
}