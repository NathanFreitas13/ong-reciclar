import { Controller, Post, Get, Body, Patch, Param } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('absences/history')
  @ApiOperation({ summary: 'Retorna o histórico de faltas dos alunos' })
  @ApiResponse({ status: 200, description: 'Histórico de faltas retornado com sucesso.' })
  getAbsenceHistory() {
    return this.attendanceService.getAbsenceHistory();
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as entradas e saídas registradas' })
  @ApiResponse({ status: 200, description: 'Lista de registros de presença retornada com sucesso.' })
  findAll() {
    return this.attendanceService.findAll();
  }
  
  @Get('process-absences')
  @ApiOperation({ summary: 'Robô: Processa as faltas diárias dos alunos' })
  @ApiResponse({ status: 200, description: 'Faltas processadas com sucesso.' })
  processDailyAbsences() {
    return this.attendanceService.processDailyAbsences();
  }

  @Get('historyfouls')
  @ApiOperation({ summary: 'Retorna o resumo total para os cards do Histórico de Faltas' })
  @ApiResponse({ status: 200, description: 'Resumo calculado com sucesso.' })
  getHistoryFouls() {
    return this.attendanceService.getHistoryFouls();
  }
  
  @Post()
  @ApiOperation({ summary: 'Registra uma entrada ou saída de um aluno (Catraca/Leitura do QR Code)' })
  @ApiResponse({ status: 201, description: 'Registro de presença criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  register(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.register(createAttendanceDto);
  }

  @Patch('absences/:id/justify')
  @ApiOperation({ summary: 'Abona uma falta específica' })
  @ApiParam({ name: 'id', description: 'ID da falta a ser abonada' })
  @ApiResponse({ status: 200, description: 'Falta abonada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Recibo de falta não encontrado.' })
  justifyAbsence(@Param('id') id: string) {
    return this.attendanceService.justifyAbsence(id);
  }
}