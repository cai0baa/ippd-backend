import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TasksModule } from './tasks/tasks.module.js';
import { ProdutosModule } from './produtos/produtos.module.js';

@Module({
  imports: [TasksModule, ProdutosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
