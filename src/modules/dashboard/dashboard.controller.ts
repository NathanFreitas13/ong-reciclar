import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../../guards/auth.guard';

@ApiTags('Dashboard')
@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('students-metrics')
  @ApiOperation({ summary: 'Retorna a lista de alunos com os cálculos de presença e faltas' })
  @ApiResponse({ status: 200, description: 'Métricas dos alunos calculadas com sucesso.' })
  getStudentsMetrics() {
    return this.dashboardService.getStudentsMetrics();
  }

  @Get('export')
  @ApiOperation({ summary: 'Exporta a lista de alunos com métricas para Excel' })
  async exportExcel(@Res() res: any) {
    try {
      const fileBuffer = await this.dashboardService.exportStudentsToExcel();

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="relatorio_ong_reciclar.xlsx"',
      });

      res.end(fileBuffer);
    } catch (error) {
      console.error('Erro na controller ao exportar:', error);
      res.status(500).json({ message: 'Erro ao processar o download do arquivo.' });
    }
  }
}
