import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalHttpExceptionFilter } from './core/http-exception.filter';
import { ProjectConfigService } from './config/project-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS 설정
  app.enableCors();

  // 보안 헤더 설정
  app.use(helmet());

  // 입력 검증 설정 (운영 환경 강화)
  const isProd = process.env.NODE_ENV === 'production';
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: isProd,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 전역 예외 필터
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // 글로벌 프리픽스 설정 (구성값 연동)
  const projectConfig = app.get(ProjectConfigService).getResolvedConfig();
  app.setGlobalPrefix(projectConfig.apiPrefix.replace(/^\//, ''));

  const port = process.env.PORT || 5849;
  await app.listen(port);

  logger.log(`🚀 Claude Auto Worker 서버가 포트 ${port}에서 실행 중입니다.`);
  logger.log(`📖 API 문서: http://localhost:${port}/api`);
  logger.log(`🔧 개발 서버: http://localhost:${port}`);
}

bootstrap();
