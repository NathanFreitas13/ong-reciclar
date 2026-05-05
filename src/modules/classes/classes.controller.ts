import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './create-class.dto';
import { AuthGuard } from '../../guards/auth.guard';

@ApiTags('Classes')
@UseGuards(AuthGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas as turmas' })
  @ApiResponse({ status: 200, description: 'Lista de turmas retornada.' })
  findAll() {
    return this.classesService.findAll();
  }
  
  @Get('summary')
  @ApiOperation({ summary: 'Retorna o resumo do Dashboard' })
  @ApiResponse({ status: 200, description: 'Resumo das turmas calculado com sucesso.' })
  getClassesSummary() {
    return this.classesService.getClassesSummary();
  }
  
  @Post()
  @ApiOperation({ summary: 'Cadastra uma nova turma no sistema' })
  @ApiResponse({ status: 201, description: 'Turma cadastrada com sucesso.' })
  @ApiResponse({ status: 409, description: 'Conflito: Turma já existe neste turno.' })
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }
}