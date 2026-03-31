import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }
  
  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'inactive',
  ) {
    return this.studentsService.updateStatus(id, status);
  }

  @Patch(':id/absence')
  addAbsence(@Param('id') id: string) {
    return this.studentsService.addAbsence(id);
  }

  @Patch(':id/remove-absence')
  removeAbsence(@Param('id') id: string) {
    return this.studentsService.removeAbsence(id);
  }
}