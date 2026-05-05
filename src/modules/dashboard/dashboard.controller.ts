import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../../guards/auth.guard';

@ApiTags('Dashboard')
@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('students-metrics')
  @ApiOperation({
    summary: 'Retorna a lista de alunos com os cálculos de presença e faltas',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas dos alunos calculadas com sucesso.',
  })
  getStudentsMetrics() {
    return this.dashboardService.getStudentsMetrics();
  }
}
