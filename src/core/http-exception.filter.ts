import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = isHttp
      ? (exception as HttpException).getResponse()
      : {
          statusCode: status,
          message: 'Internal server error',
        };

    const errorMeta = {
      method: request?.method,
      url: request?.url,
      status,
      ip: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
    };

    this.logger.error(
      `HTTP ${status} on ${errorMeta.method} ${errorMeta.url}`,
      isHttp ? undefined : String(exception),
    );

    response.status(status).json({
      ...(typeof payload === 'object' ? payload : { message: payload }),
      timestamp: new Date().toISOString(),
      path: request?.url,
    });
  }
}


