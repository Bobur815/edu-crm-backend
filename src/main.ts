import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import * as express from 'express';
import { UPLOAD_ROOT } from './common/upload/upload.util';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Global config
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(`/${UPLOAD_ROOT}`, express.static(join(process.cwd(), UPLOAD_ROOT)));

  // Swagger (OpenAPI)
  const config = new DocumentBuilder()
    .setTitle('Educational CRM API')
    .setDescription('API documentation for the EDU-CRM backend')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer' // security name (use in @ApiBearerAuth('bearer'))
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // UI at /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'EDU-CRM API Docs',
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}/api`);
    console.log(`📘 Swagger UI       http://localhost:${port}/api/docs`);
    console.log(`📂 Uploads served at /${UPLOAD_ROOT}`);
  });
}
bootstrap();
