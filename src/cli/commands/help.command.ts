import { Injectable } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';

@Injectable()
@Command({
  name: 'help',
  description: 'Show help information',
  arguments: '[command]',
})
export class HelpCommand extends CommandRunner {
  async run(passedParams: string[]): Promise<void> {
    const [command] = passedParams;

    if (command) {
      this.showCommandHelp(command);
    } else {
      this.showGeneralHelp();
    }
  }

  private showGeneralHelp(): void {
    console.log('🚀 Claude Auto Worker CLI');
    console.log('========================');
    console.log('');
    console.log('Available commands:');
    console.log('');
    console.log('  run <workflow-file>     Run a Claude workflow');
    console.log('  status                  Show workflow status');
    console.log('  logs [workflow-id]      Show workflow logs');
    console.log('  config [action]         Manage configuration (show|path|init)');
    console.log('  help [command]          Show help information');
    console.log('');
    console.log('Global options:');
    console.log('  -h, --help              Show help');
    console.log('  -V, --version           Show version');
    console.log('');
    console.log('For more information about a command, use:');
    console.log('  claude-auto-worker help <command>');
  }

  private showCommandHelp(command: string): void {
    switch (command.toLowerCase()) {
      case 'run':
        console.log('Usage: claude-auto-worker run <workflow-file> [options]');
        console.log('');
        console.log('Arguments:');
        console.log('  workflow-file          Path to the workflow file (YAML/JSON)');
        console.log('');
        console.log('Options:');
        console.log('  -d, --debug           Enable debug mode');
        console.log('  -o, --output <path>   Output directory for results');
        console.log('  --dry-run             Show what would be executed without running');
        console.log('  -h, --help            Show help for this command');
        break;

      case 'status':
        console.log('Usage: claude-auto-worker status [options]');
        console.log('');
        console.log('Options:');
        console.log('  -w, --workflow <id>   Show status for specific workflow ID');
        console.log('  -a, --all             Show status for all workflows');
        console.log('  -f, --format <format> Output format (json, table, simple)');
        console.log('  -h, --help            Show help for this command');
        break;

      case 'logs':
        console.log('Usage: claude-auto-worker logs [workflow-id] [options]');
        console.log('');
        console.log('Arguments:');
        console.log('  workflow-id            Optional workflow ID to filter logs');
        console.log('');
        console.log('Options:');
        console.log('  -f, --follow          Follow log output in real-time');
        console.log('  -n, --lines <number>  Number of lines to show');
        console.log('  --since <time>        Show logs since time (e.g., "2h", "1d")');
        console.log('  --level <level>       Log level filter (debug, info, warn, error)');
        console.log('  -h, --help            Show help for this command');
        break;

      case 'config':
        console.log('Usage: claude-auto-worker config [show|path|init] [options]');
        console.log('');
        console.log('Options:');
        console.log('  -e, --env <name>       Environment name to preview');
        console.log('  -o, --output <path>    Output path for template (init)');
        console.log('  -f, --force            Overwrite existing file (init)');
        console.log('  -h, --help             Show help for this command');
        break;

      default:
        console.log(`Unknown command: ${command}`);
        console.log('Use "claude-auto-worker help" to see available commands');
    }
  }
}
