import { Controller, Post, Get, Body } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  register(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.register(createAttendanceDto);
  }

  @Get()
  findAll() {
    return this.attendanceService.findAll();
  }
}