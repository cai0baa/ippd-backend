import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from './servidor.mjs';

test(
  'tasks: rotas, JSON e reinício do servidor',
  { timeout: 30000 },
  async (t) => {
    const servidor = await criarServidor();
    t.after(() => servidor.fechar());
    await servidor.iniciar();
    const req = servidor.requisicao.bind(servidor);
    let task;

    await t.test('GET começa com a lista vazia', async () => {
      assert.deepEqual(await req('GET', '/tasks'), []);
    });

    await t.test('POST cria a tarefa e salva no JSON', async () => {
      task = await req(
        'POST',
        '/tasks',
        { descricao: 'Testar a tarefa', inicio: 1, fim: 100 },
        201,
      );
      assert.deepEqual(task, {
        id: 1,
        descricao: 'Testar a tarefa',
        inicio: 1,
        fim: 100,
        status: 'PENDENTE',
        resultado: null,
      });
      assert.deepEqual(await servidor.lerArquivo('tasks.json'), [task]);
    });

    await t.test('GET lista e busca pelo id', async () => {
      assert.deepEqual(await req('GET', '/tasks'), [task]);
      assert.deepEqual(await req('GET', '/tasks/1'), task);
    });

    await t.test('PUT troca todos os campos', async () => {
      const dados = {
        descricao: 'Tarefa atualizada',
        inicio: 10,
        fim: 50,
        status: 'CONCLUIDA',
        resultado: [11, 13],
      };
      task = await req('PUT', '/tasks/1', dados);
      assert.deepEqual(task, { id: 1, ...dados });
    });

    await t.test('PATCH altera só o que foi enviado', async () => {
      task = { ...task, descricao: 'Mudei só a descrição' };
      assert.deepEqual(
        await req('PATCH', '/tasks/1', { descricao: task.descricao }),
        task,
      );
    });

    await t.test('PATCH aceita limpar o resultado com null', async () => {
      task = { ...task, resultado: null };
      assert.deepEqual(
        await req('PATCH', '/tasks/1', { resultado: null }),
        task,
      );
    });

    await t.test('recusa dados errados sem alterar o arquivo', async () => {
      const antes = await servidor.lerArquivo('tasks.json');
      await req(
        'POST',
        '/tasks',
        { descricao: 'Inválida', inicio: '1', fim: 10 },
        400,
      );
      await req(
        'POST',
        '/tasks',
        { descricao: 'Inválida', inicio: 20, fim: 10 },
        400,
      );
      await req('PUT', '/tasks/1', { descricao: 'Faltou o resto' }, 400);
      await req(
        'PUT',
        '/tasks/1',
        {
          descricao: 'Faltou resultado',
          inicio: 1,
          fim: 2,
          status: 'PENDENTE',
        },
        400,
      );
      await req('PATCH', '/tasks/1', { inicio: 100 }, 400);
      await req('PATCH', '/tasks/1', { descricao: null }, 400);
      await req('PATCH', '/tasks/1', { id: 99 }, 400);
      await req('PATCH', '/tasks/1', { resultado: ['texto'] }, 400);
      assert.deepEqual(await servidor.lerArquivo('tasks.json'), antes);
    });

    await t.test(
      'id inválido dá 400 e registro inexistente dá 404',
      async () => {
        await req('GET', '/tasks/abc', undefined, 400);
        await req('GET', '/tasks/999', undefined, 404);
        await req(
          'PUT',
          '/tasks/999',
          {
            descricao: 'Teste',
            inicio: 1,
            fim: 2,
            status: 'PENDENTE',
            resultado: null,
          },
          404,
        );
        await req('PATCH', '/tasks/999', { status: 'CONCLUIDA' }, 404);
        await req('DELETE', '/tasks/999', undefined, 404);
      },
    );

    await t.test(
      'continua tudo salvo depois de parar e iniciar o servidor',
      async () => {
        await servidor.reiniciar();
        assert.deepEqual(await req('GET', '/tasks/1'), task);
        assert.deepEqual(await servidor.lerArquivo('tasks.json'), [task]);
      },
    );

    await t.test(
      'POST simultâneos não perdem tarefas nem repetem ids',
      async () => {
        const novas = await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            req(
              'POST',
              '/tasks',
              { descricao: 'Tarefa ' + i, inicio: i, fim: i + 10 },
              201,
            ),
          ),
        );
        assert.equal(new Set(novas.map((item) => item.id)).size, 10);
        assert.equal((await req('GET', '/tasks')).length, 11);
        assert.equal((await servidor.lerArquivo('tasks.json')).length, 11);
      },
    );

    await t.test(
      'DELETE remove e a tarefa não volta depois de reiniciar',
      async () => {
        await req('DELETE', '/tasks/1', undefined, 204);
        await req('GET', '/tasks/1', undefined, 404);
        await servidor.reiniciar();
        const restantes = await req('GET', '/tasks');
        assert.equal(restantes.length, 10);
        assert.equal(
          restantes.some((item) => item.id === 1),
          false,
        );
        assert.deepEqual(await servidor.lerArquivo('tasks.json'), restantes);
      },
    );
  },
);
