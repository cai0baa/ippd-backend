import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export class ArquivoJson<T> {
  private readonly caminho: string;
  private fila: Promise<void> = Promise.resolve();

  constructor(nome: string) {
    this.caminho = join(
      process.env.DATA_DIR ?? join(process.cwd(), 'data'),
      nome,
    );
  }

  private async carregar(): Promise<T[]> {
    try {
      const dados: unknown = JSON.parse(await readFile(this.caminho, 'utf8'));
      if (!Array.isArray(dados))
        throw new Error('O arquivo precisa conter uma lista');
      return dados as T[];
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw erro;
    }
  }

  async ler(): Promise<T[]> {
    await this.fila;
    return this.carregar();
  }

  alterar<R>(operacao: (itens: T[]) => R): Promise<R> {
    // A fila inclui a leitura, pra uma requisição não apagar a outra.
    const tarefa = this.fila.then(async () => {
      const itens = await this.carregar();
      const resultado = operacao(itens);
      await mkdir(dirname(this.caminho), { recursive: true });
      const temporario = this.caminho + '.tmp';
      await writeFile(
        temporario,
        JSON.stringify(itens, null, 2) + '\n',
        'utf8',
      );
      await rename(temporario, this.caminho);
      return resultado;
    });

    // Uma operação que falhou não pode travar as próximas.
    this.fila = tarefa.then(
      () => undefined,
      () => undefined,
    );
    return tarefa;
  }
}
