import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from './servidor.mjs';

test(
  'produtos: rotas, JSON e reinício do servidor',
  { timeout: 30000 },
  async (t) => {
    const servidor = await criarServidor();
    t.after(() => servidor.fechar());
    await servidor.iniciar();
    const req = servidor.requisicao.bind(servidor);
    let produto;

    await t.test('GET começa com a lista vazia', async () => {
      assert.deepEqual(await req('GET', '/produtos'), []);
    });

    await t.test('POST cria o produto e salva no JSON', async () => {
      produto = await req(
        'POST',
        '/produtos',
        { nome: 'Caderno', preco: 15.5, estoque: 10 },
        201,
      );
      assert.deepEqual(produto, {
        id: 1,
        nome: 'Caderno',
        preco: 15.5,
        estoque: 10,
      });
      assert.deepEqual(await servidor.lerArquivo('produtos.json'), [produto]);
    });

    await t.test('GET lista e busca pelo id', async () => {
      assert.deepEqual(await req('GET', '/produtos'), [produto]);
      assert.deepEqual(await req('GET', '/produtos/1'), produto);
    });

    await t.test('PUT troca todos os campos', async () => {
      const dados = { nome: 'Caderno grande', preco: 22.9, estoque: 5 };
      produto = await req('PUT', '/produtos/1', dados);
      assert.deepEqual(produto, { id: 1, ...dados });
    });

    await t.test('PATCH altera só o estoque e aceita zero', async () => {
      produto = { ...produto, estoque: 0 };
      assert.deepEqual(
        await req('PATCH', '/produtos/1', { estoque: 0 }),
        produto,
      );
    });

    await t.test('recusa dados errados sem alterar o arquivo', async () => {
      const antes = await servidor.lerArquivo('produtos.json');
      await req('POST', '/produtos', { nome: '', preco: 10, estoque: 1 }, 400);
      await req(
        'POST',
        '/produtos',
        { nome: 'Teste', preco: -1, estoque: 1 },
        400,
      );
      await req(
        'POST',
        '/produtos',
        { nome: 'Teste', preco: 2.999, estoque: 1 },
        400,
      );
      await req(
        'POST',
        '/produtos',
        { nome: 'Teste', preco: '10', estoque: 1 },
        400,
      );
      await req(
        'POST',
        '/produtos',
        { nome: 'Teste', preco: 10, estoque: 1.5 },
        400,
      );
      await req('PUT', '/produtos/1', { nome: 'Faltou o resto' }, 400);
      await req('PATCH', '/produtos/1', { estoque: -1 }, 400);
      await req('PATCH', '/produtos/1', { nome: null }, 400);
      await req('PATCH', '/produtos/1', { id: 99 }, 400);
      assert.deepEqual(await servidor.lerArquivo('produtos.json'), antes);
    });

    await t.test(
      'id inválido dá 400 e registro inexistente dá 404',
      async () => {
        await req('GET', '/produtos/abc', undefined, 400);
        await req('GET', '/produtos/999', undefined, 404);
        await req(
          'PUT',
          '/produtos/999',
          { nome: 'Teste', preco: 1, estoque: 1 },
          404,
        );
        await req('PATCH', '/produtos/999', { estoque: 1 }, 404);
        await req('DELETE', '/produtos/999', undefined, 404);
      },
    );

    await t.test(
      'continua tudo salvo depois de parar e iniciar o servidor',
      async () => {
        await servidor.reiniciar();
        assert.deepEqual(await req('GET', '/produtos/1'), produto);
        assert.deepEqual(await servidor.lerArquivo('produtos.json'), [produto]);
      },
    );

    await t.test(
      'POST simultâneos não perdem produtos nem repetem ids',
      async () => {
        const novos = await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            req(
              'POST',
              '/produtos',
              { nome: 'Produto ' + i, preco: i, estoque: i },
              201,
            ),
          ),
        );
        assert.equal(new Set(novos.map((item) => item.id)).size, 10);
        assert.equal((await req('GET', '/produtos')).length, 11);
        assert.equal((await servidor.lerArquivo('produtos.json')).length, 11);
      },
    );

    await t.test('cada módulo usa seu próprio arquivo', async () => {
      const produtos = await req('GET', '/produtos');
      const task = await req(
        'POST',
        '/tasks',
        { descricao: 'Conferir o estoque', inicio: 1, fim: 10 },
        201,
      );
      assert.deepEqual(await req('GET', '/produtos'), produtos);
      assert.deepEqual(await servidor.lerArquivo('tasks.json'), [task]);
      assert.deepEqual(await servidor.lerArquivo('produtos.json'), produtos);
      await servidor.reiniciar();
      assert.deepEqual(await req('GET', '/tasks/' + task.id), task);
      assert.deepEqual(await req('GET', '/produtos'), produtos);
    });

    await t.test(
      'DELETE remove e o produto não volta depois de reiniciar',
      async () => {
        await req('DELETE', '/produtos/1', undefined, 204);
        await req('GET', '/produtos/1', undefined, 404);
        await servidor.reiniciar();
        const restantes = await req('GET', '/produtos');
        assert.equal(restantes.length, 10);
        assert.equal(
          restantes.some((item) => item.id === 1),
          false,
        );
        assert.deepEqual(await servidor.lerArquivo('produtos.json'), restantes);
      },
    );
  },
);
