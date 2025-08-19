import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS 설정
  app.enableCors();

  // 글로벌 프리픽스 설정
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 5849;
  await app.listen(port);

  logger.log(`🚀 Claude Auto Worker 서버가 포트 ${port}에서 실행 중입니다.`);
  logger.log(`📖 API 문서: http://localhost:${port}/api`);
  logger.log(`🔧 개발 서버: http://localhost:${port}`);
}

bootstrap();
