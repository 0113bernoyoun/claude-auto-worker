import { Test } from '@nestjs/testing';
import { ConfigCommand } from '../../../src/cli/commands/config.command';
import { ProjectConfigService } from '../../../src/config/project-config.service';
import { cliTestHelpers } from '../../setup/cli.setup';

describe('ConfigCommand', () => {
  let command: ConfigCommand;
  let svc: ProjectConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ConfigCommand, ProjectConfigService],
    }).compile();
    command = moduleRef.get(ConfigCommand);
    svc = moduleRef.get(ProjectConfigService);
  });

  describe('show 명령어', () => {
    it('설정을 표시할 때 에러가 발생하지 않아야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run(['show'], {});
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });

    it('show 명령어 실행 시 적절한 메시지가 출력되어야 함', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await command.run(['show'], {});
        expect(spy).toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('path 명령어', () => {
    it('경로가 사용 가능할 때 경로를 출력해야 함', async () => {
      jest.spyOn(svc, 'getResolvedPath').mockReturnValue('/tmp/claude.yaml');
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run(['path'], {});
        expect(outputs.some(o => o.message.includes('/tmp/claude.yaml'))).toBe(true);
      } finally {
        restore();
      }
    });

    it('경로가 없을 때 적절한 메시지를 출력해야 함', async () => {
      jest.spyOn(svc, 'getResolvedPath').mockReturnValue(null);
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run(['path'], {});
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });
  });

  describe('init 명령어', () => {
    it('템플릿 초기화가 성공적으로 완료되어야 함', async () => {
      jest.spyOn(svc, 'writeTemplate').mockReturnValue('/tmp/claude.yaml');
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run(['init'], { force: true });
        expect(outputs.some(o => o.message.includes('Wrote template'))).toBe(true);
      } finally {
        restore();
      }
    });

    it('force 옵션이 없을 때 확인 메시지를 출력해야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run(['init'], {});
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });
  });

  describe('에러 처리', () => {
    it('서비스 에러 발생 시 적절히 처리되어야 함', async () => {
      jest.spyOn(svc, 'getResolvedPath').mockImplementation(() => {
        throw new Error('Config service error');
      });
      
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        const result = await cliTestHelpers.catchErrors(() => 
          command.run(['path'], {})
        );
        expect(result.error).toBeDefined();
      } finally {
        restore();
      }
    });
  });

  describe('명령어 옵션', () => {
    it('알 수 없는 명령어에 대해 적절한 메시지를 출력해야 함', async () => {
      const { outputs, restore } = cliTestHelpers.captureConsoleOutput();
      
      try {
        await command.run(['unknown'], {});
        expect(outputs.some(o => o.type === 'log')).toBe(true);
      } finally {
        restore();
      }
    });
  });
});


