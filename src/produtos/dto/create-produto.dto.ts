import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateProdutoDto {
  @IsString({ message: 'O nome precisa ser um texto' })
  @IsNotEmpty({ message: 'Preenche o nome' })
  nome: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O preço precisa ser um número com até duas casas decimais' },
  )
  @Min(0, { message: 'O preço não pode ser negativo' })
  preco: number;

  @IsInt({ message: 'O estoque precisa ser um número inteiro' })
  @Min(0, { message: 'O estoque não pode ser negativo' })
  estoque: number;
}
