import {
  Controller,
  Post,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guard';

@ApiTags('Attendance')
@UseGuards(AuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as entradas e saídas registradas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de registros de presença retornada com sucesso.',
  })
  findAll() {
    return this.attendanceService.findAll();
  }

  @Get('absence-filter')
  async filterAbsences(
    @Query('studentId') studentId?: string,
    @Query('className') className?: string,
    @Query('shift') shift?: string,
    @Query('status') status?: string,
  ) {
    return this.attendanceService.filterAbsences(
      studentId,
      className,
      shift,
      status,
    );
  }

  @Get('absences/history')
  @ApiOperation({ summary: 'Retorna o histórico de faltas dos alunos' })
  @ApiResponse({
    status: 200,
    description: 'Histórico de faltas retornado com sucesso.',
  })
  getAbsenceHistory(
    @Query('page') page: string,
    @Query('qttd') qttd: number,
  ) {
    const pageNum = parseInt(page) || 1;
    return this.attendanceService.getAbsenceHistory(pageNum, qttd);
  }

  @Get('process-absences')
  @ApiOperation({ summary: 'Robô: Processa as faltas diárias dos alunos' })
  @ApiResponse({ status: 200, description: 'Faltas processadas com sucesso.' })
  processDailyAbsences() {
    return this.attendanceService.processDailyAbsences();
  }

  @Get('historyfouls')
  @ApiOperation({
    summary: 'Retorna o resumo total para os cards do Histórico de Faltas',
  })
  @ApiResponse({ status: 200, description: 'Resumo calculado com sucesso.' })
  getHistoryFouls() {
    return this.attendanceService.getHistoryFouls();
  }

  @Get('absences/history/export')
  @ApiOperation({
    summary: 'Exporta o histórico detalhado de faltas para Excel',
  })
  async exportAbsenceHistory(@Res() res: any) {
    try {
      const fileBuffer = await this.attendanceService.exportHistoryToExcel();

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="historico_faltas_reciclar.xlsx"',
      });

      res.end(fileBuffer);
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Erro ao processar o download do arquivo.' });
    }
  }

  @Post()
  @ApiOperation({
    summary:
      'Registra uma entrada ou saída de um aluno (Catraca/Leitura do QR Code)',
  })
  @ApiResponse({
    status: 201,
    description: 'Registro de presença criado com sucesso.',
  })
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
