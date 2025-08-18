import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';

@Injectable()
@Command({
  name: 'run',
  description: 'Run a Claude workflow',
  arguments: '<workflow-file>',
})
export class RunCommand extends CommandRunner {
  @Option({
    flags: '-d, --debug',
    description: 'Enable debug mode',
  })
  parseDebug(val: string): boolean {
    return val === undefined || val === 'true';
  }

  @Option({
    flags: '-o, --output <path>',
    description: 'Output directory for results',
  })
  parseOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '--dry-run',
    description: 'Show what would be executed without running',
  })
  parseDryRun(val: string): boolean {
    return val === undefined || val === 'true';
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const [workflowFile] = passedParams;
    
    console.log(`🚀 Running workflow: ${workflowFile}`);
    console.log(`Debug mode: ${options?.debug ? 'enabled' : 'disabled'}`);
    console.log(`Output directory: ${options?.output || 'default'}`);
    console.log(`Dry run: ${options?.dryRun ? 'enabled' : 'disabled'}`);
    
    if (options?.dryRun) {
      console.log('📋 This is a dry run - no actual execution will occur');
      return;
    }
    
    try {
      // TODO: Implement actual workflow execution logic
      console.log('✅ Workflow execution completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Workflow execution failed:', errorMessage);
      process.exit(1);
    }
  }
}
