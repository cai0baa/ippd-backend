import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
} from 'class-validator';
import { CreateTaskDto } from './create-task.dto.js';

export class UpdateTaskDto extends CreateTaskDto {
  @IsString({ message: 'O status precisa ser um texto' })
  @IsNotEmpty({ message: 'Preenche o status' })
  status: string;

  @ValidateIf((_objeto, valor) => valor !== null)
  @IsDefined({ message: 'Envia o resultado, pode ser null' })
  @IsArray({ message: 'O resultado precisa ser uma lista ou null' })
  @IsNumber({}, { each: true, message: 'O resultado só pode ter números' })
  resultado: number[] | null;
}
