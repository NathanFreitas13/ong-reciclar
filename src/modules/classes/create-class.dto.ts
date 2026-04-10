import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'Turma A', description: 'Nome da turma' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Manhã/Tarde', description: 'Turno da turma (Ex: Manhã, Tarde, Noite)' })
  @IsString()
  @IsNotEmpty()
  shift!: string;
}