import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateTaskDto {
  @IsString({ message: 'A descrição precisa ser um texto' })
  @IsNotEmpty({ message: 'Preenche a descrição' })
  descricao: string;

  @IsInt({ message: 'O início precisa ser um número inteiro' })
  @Min(0, { message: 'O início não pode ser negativo' })
  inicio: number;

  @IsInt({ message: 'O fim precisa ser um número inteiro' })
  @Min(0, { message: 'O fim não pode ser negativo' })
  fim: number;
}
