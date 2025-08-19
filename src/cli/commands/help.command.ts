import { Injectable } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';

@Injectable()
@Command({
  name: 'help',
  description: 'Show help information and usage examples',
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
    console.log('Claude Auto Worker는 Claude API를 활용한 자동화 워크플로우 엔진입니다.');
    console.log('YAML/JSON 워크플로우 파일을 실행하여 Claude와 상호작용하고 Git 연동을 수행합니다.');
    console.log('');
    console.log('📚 Available commands:');
    console.log('');
    console.log('  run <workflow-file>     🚀 워크플로우 실행');
    console.log('  status                  📊 워크플로우 상태 확인');
    console.log('  logs [workflow-id]      📝 워크플로우 로그 보기');
    console.log('  config [action]         ⚙️  설정 관리 (show|path|init)');
    console.log('  help [command]          ❓ 도움말 정보');
    console.log('');
    console.log('🔧 Global options:');
    console.log('  -h, --help              도움말 표시');
    console.log('  -V, --version           버전 정보 표시');
    console.log('');
    console.log('💡 Quick start examples:');
    console.log('  # 워크플로우 실행');
    console.log('  claude-auto-worker run workflow.yaml');
    console.log('');
    console.log('  # 상태 확인');
    console.log('  claude-auto-worker status');
    console.log('');
    console.log('  # 특정 명령어 도움말');
    console.log('  claude-auto-worker help run');
    console.log('');
    console.log('📖 For more information about a command, use:');
    console.log('  claude-auto-worker help <command>');
    console.log('');
    console.log('🔗 Documentation: https://github.com/0113bernoyoun/claude-auto-worker');
  }

  private showCommandHelp(command: string): void {
    switch (command.toLowerCase()) {
      case 'run':
        console.log('🚀 Command: run');
        console.log('================');
        console.log('');
        console.log('Description: Claude 워크플로우를 실행합니다.');
        console.log('YAML 또는 JSON 형식의 워크플로우 파일을 읽어 Claude API와 상호작용하고');
        console.log('지정된 작업을 수행합니다.');
        console.log('');
        console.log('Usage: claude-auto-worker run <workflow-file> [options]');
        console.log('');
        console.log('Arguments:');
        console.log('  workflow-file          워크플로우 파일 경로 (YAML/JSON)');
        console.log('');
        console.log('Options:');
        console.log('  -d, --debug           디버그 모드 활성화 (상세 로그 출력)');
        console.log('  -o, --output <path>   결과 출력 디렉토리 지정');
        console.log('  --dry-run             실제 실행 없이 실행 계획만 표시');
        console.log('  -h, --help            이 명령어의 도움말 표시');
        console.log('');
        console.log('💡 Examples:');
        console.log('  # 기본 워크플로우 실행');
        console.log('  claude-auto-worker run my-workflow.yaml');
        console.log('');
        console.log('  # 디버그 모드로 실행');
        console.log('  claude-auto-worker run workflow.yaml --debug');
        console.log('');
        console.log('  # 출력 디렉토리 지정');
        console.log('  claude-auto-worker run workflow.yaml -o ./results');
        console.log('');
        console.log('  # 드라이 런 (실행 계획만 확인)');
        console.log('  claude-auto-worker run workflow.yaml --dry-run');
        break;

      case 'status':
        console.log('📊 Command: status');
        console.log('==================');
        console.log('');
        console.log('Description: 실행 중이거나 완료된 워크플로우의 상태를 확인합니다.');
        console.log('현재 실행 상태, 진행률, 완료 시간 등의 정보를 제공합니다.');
        console.log('');
        console.log('Usage: claude-auto-worker status [options]');
        console.log('');
        console.log('Options:');
        console.log('  -w, --workflow <id>   특정 워크플로우 ID의 상태 표시');
        console.log('  -a, --all             모든 워크플로우 상태 표시');
        console.log('  -f, --format <format> 출력 형식 지정 (json, table, simple)');
        console.log('  -h, --help            이 명령어의 도움말 표시');
        console.log('');
        console.log('💡 Examples:');
        console.log('  # 모든 워크플로우 상태 확인');
        console.log('  claude-auto-worker status');
        console.log('');
        console.log('  # 특정 워크플로우 상태 확인');
        console.log('  claude-auto-worker status -w workflow-123');
        console.log('');
        console.log('  # JSON 형식으로 출력');
        console.log('  claude-auto-worker status --format json');
        break;

      case 'logs':
        console.log('📝 Command: logs');
        console.log('================');
        console.log('');
        console.log('Description: 워크플로우 실행 로그를 확인합니다.');
        console.log('실행 과정, 에러, 경고 등의 상세 정보를 제공합니다.');
        console.log('');
        console.log('Usage: claude-auto-worker logs [workflow-id] [options]');
        console.log('');
        console.log('Arguments:');
        console.log('  workflow-id            로그를 필터링할 워크플로우 ID (선택사항)');
        console.log('');
        console.log('Options:');
        console.log('  -f, --follow          실시간으로 로그 출력 추적');
        console.log('  -n, --lines <number>  표시할 로그 라인 수');
        console.log('  --since <time>        특정 시간 이후의 로그 표시 (예: "2h", "1d")');
        console.log('  --level <level>       로그 레벨 필터 (debug, info, warn, error)');
        console.log('  -h, --help            이 명령어의 도움말 표시');
        console.log('');
        console.log('💡 Examples:');
        console.log('  # 모든 로그 확인');
        console.log('  claude-auto-worker logs');
        console.log('');
        console.log('  # 특정 워크플로우 로그 확인');
        console.log('  claude-auto-worker logs workflow-123');
        console.log('');
        console.log('  # 실시간 로그 추적');
        console.log('  claude-auto-worker logs -f');
        console.log('');
        console.log('  # 최근 100줄 로그 확인');
        console.log('  claude-auto-worker logs -n 100');
        break;

      case 'config':
        console.log('⚙️  Command: config');
        console.log('==================');
        console.log('');
        console.log('Description: Claude Auto Worker의 설정을 관리합니다.');
        console.log('설정 파일 생성, 경로 확인, 환경별 설정 등을 수행합니다.');
        console.log('');
        console.log('Usage: claude-auto-worker config [show|path|init] [options]');
        console.log('');
        console.log('Subcommands:');
        console.log('  show                   현재 설정 내용 표시');
        console.log('  path                   설정 파일 경로 표시');
        console.log('  init                   기본 설정 파일 생성');
        console.log('');
        console.log('Options:');
        console.log('  -e, --env <name>       미리보기할 환경 이름');
        console.log('  -o, --output <path>    템플릿 출력 경로 (init 명령어용)');
        console.log('  -f, --force            기존 파일 덮어쓰기 (init 명령어용)');
        console.log('  -h, --help             이 명령어의 도움말 표시');
        console.log('');
        console.log('💡 Examples:');
        console.log('  # 현재 설정 확인');
        console.log('  claude-auto-worker config show');
        console.log('');
        console.log('  # 설정 파일 경로 확인');
        console.log('  claude-auto-worker config path');
        console.log('');
        console.log('  # 기본 설정 파일 생성');
        console.log('  claude-auto-worker config init');
        console.log('');
        console.log('  # 특정 경로에 설정 파일 생성');
        console.log('  claude-auto-worker config init -o ./config.yaml');
        break;

      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('');
        console.log('Available commands:');
        console.log('  run, status, logs, config, help');
        console.log('');
        console.log('Use "claude-auto-worker help" to see all available commands');
        console.log('Use "claude-auto-worker help <command>" for detailed help');
    }
  }
}
