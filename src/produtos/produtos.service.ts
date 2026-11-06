import { Injectable, NotFoundException } from '@nestjs/common';
import { ArquivoJson } from '../arquivo-json.js';
import { CreateProdutoDto } from './dto/create-produto.dto.js';
import { UpdateProdutoDto } from './dto/update-produto.dto.js';
import { PatchProdutoDto } from './dto/patch-produto.dto.js';
import type { Produto } from './entities/produto.entity.js';

@Injectable()
export class ProdutosService {
  private readonly arquivo = new ArquivoJson<Produto>('produtos.json');

  findAll() {
    return this.arquivo.ler();
  }

  async findOne(id: number) {
    const produtos = await this.findAll();
    return produtos[this.indice(produtos, id)];
  }

  create(dto: CreateProdutoDto) {
    return this.arquivo.alterar((produtos) => {
      const produto: Produto = {
        id: produtos.reduce((maior, item) => Math.max(maior, item.id), 0) + 1,
        nome: dto.nome,
        preco: dto.preco,
        estoque: dto.estoque,
      };
      produtos.push(produto);
      return produto;
    });
  }

  update(id: number, dto: UpdateProdutoDto) {
    return this.arquivo.alterar((produtos) => {
      const indice = this.indice(produtos, id);
      produtos[indice] = {
        id,
        nome: dto.nome,
        preco: dto.preco,
        estoque: dto.estoque,
      };
      return produtos[indice];
    });
  }

  patch(id: number, dto: PatchProdutoDto) {
    return this.arquivo.alterar((produtos) => {
      const indice = this.indice(produtos, id);
      const atual = produtos[indice];
      produtos[indice] = {
        id,
        nome: dto.nome ?? atual.nome,
        preco: dto.preco ?? atual.preco,
        estoque: dto.estoque ?? atual.estoque,
      };
      return produtos[indice];
    });
  }

  remove(id: number) {
    return this.arquivo.alterar((produtos) => {
      produtos.splice(this.indice(produtos, id), 1);
    });
  }

  private indice(produtos: Produto[], id: number) {
    const indice = produtos.findIndex((produto) => produto.id === id);
    if (indice === -1) throw new NotFoundException('Produto não encontrado');
    return indice;
  }
}
