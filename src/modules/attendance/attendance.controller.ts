import { Controller, Post, Get, Body, Patch, Param } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('absences/history')
  getAbsenceHistory() {
    return this.attendanceService.getAbsenceHistory();
  }

  @Get()
  findAll() {
    return this.attendanceService.findAll();
  }
  
  @Get('process-absences')
  processDailyAbsences() {
    return this.attendanceService.processDailyAbsences();
  }
  
  @Post()
  register(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.register(createAttendanceDto);
  }

  @Patch('absences/:id/justify')
  justifyAbsence(@Param('id') id: string) {
    return this.attendanceService.justifyAbsence(id);
  }
}