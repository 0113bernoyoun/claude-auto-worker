import { Module } from '@nestjs/common';
import { WorkflowParserService } from './workflow.parser.service';
import { WorkflowValidatorService } from './workflow.validator.service';

@Module({
  providers: [WorkflowParserService, WorkflowValidatorService],
  exports: [WorkflowParserService, WorkflowValidatorService],
})
export class ParserModule {}



