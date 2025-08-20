import { Module } from '@nestjs/common';
import { CommandParserService } from './command.parser.service';
import { GitPolicyService } from './git.policy.service';
import { TemplateEngineService } from './template.engine.service';
import { WorkflowParserService } from './workflow.parser.service';
import { WorkflowValidatorService } from './workflow.validator.service';

@Module({
  providers: [
    WorkflowParserService,
    WorkflowValidatorService,
    TemplateEngineService,
    CommandParserService,
    GitPolicyService,
  ],
  exports: [
    WorkflowParserService,
    WorkflowValidatorService,
    TemplateEngineService,
    CommandParserService,
    GitPolicyService,
  ],
})
export class ParserModule {}



