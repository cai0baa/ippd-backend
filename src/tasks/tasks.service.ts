import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArquivoJson } from '../arquivo-json.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { PatchTaskDto } from './dto/patch-task.dto.js';
import type { Task } from './entities/task.entity.js';

// Seguindo o exemplo da aula: https://github.com/felipehaertel/backend
@Injectable()
export class TasksService {
  private readonly arquivo = new ArquivoJson<Task>('tasks.json');

  findAll() {
    return this.arquivo.ler();
  }

  async findOne(id: number) {
    const tasks = await this.findAll();
    return tasks[this.indice(tasks, id)];
  }

  create(dto: CreateTaskDto) {
    return this.arquivo.alterar((tasks) => {
      this.validarIntervalo(dto);
      const task: Task = {
        id: tasks.reduce((maior, item) => Math.max(maior, item.id), 0) + 1,
        descricao: dto.descricao,
        inicio: dto.inicio,
        fim: dto.fim,
        status: 'PENDENTE',
        resultado: null,
      };
      tasks.push(task);
      return task;
    });
  }

  update(id: number, dto: UpdateTaskDto) {
    return this.arquivo.alterar((tasks) => {
      const indice = this.indice(tasks, id);
      this.validarIntervalo(dto);
      tasks[indice] = {
        id,
        descricao: dto.descricao,
        inicio: dto.inicio,
        fim: dto.fim,
        status: dto.status,
        resultado: dto.resultado,
      };
      return tasks[indice];
    });
  }

  patch(id: number, dto: PatchTaskDto) {
    return this.arquivo.alterar((tasks) => {
      const indice = this.indice(tasks, id);
      const atual = tasks[indice];
      const task: Task = {
        id,
        descricao: dto.descricao ?? atual.descricao,
        inicio: dto.inicio ?? atual.inicio,
        fim: dto.fim ?? atual.fim,
        status: dto.status ?? atual.status,
        resultado:
          dto.resultado === undefined ? atual.resultado : dto.resultado,
      };
      this.validarIntervalo(task);
      tasks[indice] = task;
      return task;
    });
  }

  remove(id: number) {
    return this.arquivo.alterar((tasks) => {
      tasks.splice(this.indice(tasks, id), 1);
    });
  }

  private indice(tasks: Task[], id: number) {
    const indice = tasks.findIndex((task) => task.id === id);
    if (indice === -1) throw new NotFoundException('Tarefa não encontrada');
    return indice;
  }

  private validarIntervalo(task: { inicio: number; fim: number }) {
    if (task.fim < task.inicio) {
      throw new BadRequestException('O fim não pode ser menor que o início');
    }
  }
}
