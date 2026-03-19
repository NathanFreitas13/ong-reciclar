import { Controller, Get, Post, Body } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() body: any) {
    return this.studentsService.create(body);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }
}