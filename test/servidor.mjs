import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import assert from 'node:assert/strict';

export async function criarServidor() {
  const pasta = await mkdtemp(join(tmpdir(), 'ippd-teste-'));
  let processo;
  let url;

  async function parar() {
    if (!processo || processo.exitCode !== null || processo.signalCode !== null)
      return;
    const saiu = once(processo, 'exit');
    processo.kill('SIGTERM');
    const limite = setTimeout(() => processo.kill('SIGKILL'), 3000);
    try {
      await saiu;
    } finally {
      clearTimeout(limite);
    }
  }

  async function iniciar() {
    const reserva = createServer();
    reserva.listen(0, '127.0.0.1');
    await once(reserva, 'listening');
    const porta = reserva.address().port;
    await new Promise((resolve, reject) =>
      reserva.close((erro) => (erro ? reject(erro) : resolve())),
    );
    url = 'http://127.0.0.1:' + porta;
    processo = spawn(process.execPath, ['dist/main.js'], {
      env: { ...process.env, PORT: String(porta), DATA_DIR: pasta },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    processo.stdout.on('data', (dados) => {
      log += dados;
    });
    processo.stderr.on('data', (dados) => {
      log += dados;
    });
    processo.on('error', (erro) => {
      log += erro.message;
    });
    for (let tentativa = 0; tentativa < 100; tentativa++) {
      if (processo.exitCode !== null) break;
      try {
        const resposta = await fetch(url, { signal: AbortSignal.timeout(500) });
        if (resposta.ok) return;
      } catch {}
      await esperar(100);
    }
    await parar();
    throw new Error('O servidor não iniciou: ' + log);
  }

  return {
    iniciar,
    async reiniciar() {
      await parar();
      await iniciar();
    },
    async fechar() {
      await parar();
      await rm(pasta, { recursive: true, force: true });
    },
    async lerArquivo(nome) {
      return JSON.parse(await readFile(join(pasta, nome), 'utf8'));
    },
    async requisicao(metodo, rota, corpo, status = 200) {
      const resposta = await fetch(url + rota, {
        method: metodo,
        headers:
          corpo === undefined ? {} : { 'Content-Type': 'application/json' },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(5000),
      });
      const texto = await resposta.text();
      assert.equal(resposta.status, status, metodo + ' ' + rota + ': ' + texto);
      return texto ? JSON.parse(texto) : null;
    },
  };
}
