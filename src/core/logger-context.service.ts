import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerContextService {
  private readonly logger = new Logger('Execution');

  log(message: string, context?: { workflow?: string; stage?: string; step?: string }): void {
    const prefix = this.buildPrefix(context);
    this.logger.log(`${prefix}${message}`);
  }

  warn(message: string, context?: { workflow?: string; stage?: string; step?: string }): void {
    const prefix = this.buildPrefix(context);
    this.logger.warn(`${prefix}${message}`);
  }

  error(message: string, context?: { workflow?: string; stage?: string; step?: string }): void {
    const prefix = this.buildPrefix(context);
    this.logger.error(`${prefix}${message}`);
  }

  private buildPrefix(context?: { workflow?: string; stage?: string; step?: string }): string {
    const parts: string[] = [];
    if (context?.workflow) parts.push(`wf:${context.workflow}`);
    if (context?.stage) parts.push(`st:${context.stage}`);
    if (context?.step) parts.push(`sp:${context.step}`);
    return parts.length > 0 ? `[${parts.join(' ')}] ` : '';
  }
}


