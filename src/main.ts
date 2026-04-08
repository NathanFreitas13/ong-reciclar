import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { title } from 'process';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('API - Instituto Reciclar')
    .setDescription('API para gerenciamento de alunos, turmas e presenças do Instituto Reciclar')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const { apiReference } = await import('@scalar/nestjs-api-reference');

  app.use(
    '/docs',
    apiReference({
      theme: 'purple',
      layout: 'modern',
      spec: {
        content: document,
      },
      metaData: {
        title: 'API - Instituto Reciclar',
      },
    } as any),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(` API da ONG rodando em: http://localhost:${port}`);
  console.log(` Documentação rodando em: http://localhost:${port}/docs`);
}
bootstrap();
