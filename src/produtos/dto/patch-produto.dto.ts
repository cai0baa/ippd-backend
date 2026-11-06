import { PartialType } from '@nestjs/mapped-types';
import { UpdateProdutoDto } from './update-produto.dto.js';

export class PatchProdutoDto extends PartialType(UpdateProdutoDto, {
  skipNullProperties: false,
}) {}
