import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global response wrapper
  app.useGlobalInterceptors(new ResponseInterceptor());

  // CORS
  app.enableCors({
    origin: configService.get('nodeEnv') === 'production' ? false : '*',
    credentials: true,
  });

  // Swagger
  if (configService.get('nodeEnv') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Jewellery ERP API')
      .setDescription('Jewellery ERP & Girvi Management Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('port', 3000);
  await app.listen(port);
  console.log(`Application running on port ${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
