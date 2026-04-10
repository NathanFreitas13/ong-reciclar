import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
    @ApiProperty({ example: 'João Silva', description: 'Nome completo do aluno' })
    @IsString()
    @IsNotEmpty()
    fullName!: string;

    @ApiProperty({ example: 'Turma A', description: 'Nome da turma' })
    @IsString()
    @IsNotEmpty()
    className!: string;

    @ApiProperty({ example: 'Manhã/Tarde', description: 'Turno da turma' })
    @IsString()
    @IsNotEmpty()
    shift!: string;

    @ApiProperty({ example: 2026, description: 'Ano de expiração da matrícula' })
    @IsNumber()
    @IsNotEmpty()
    expirationYear!: number;
}