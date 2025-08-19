import { Module } from '@nestjs/common';
import { WorkflowParserService } from './workflow.parser.service';

@Module({
  providers: [WorkflowParserService],
  exports: [WorkflowParserService],
})
export class ParserModule {}



