import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Status da API', description: 'Retorna uma mensagem simples indicando que a API está funcionando.' })
  @ApiResponse({ status: 200, description: 'API respondeu com sucesso.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
