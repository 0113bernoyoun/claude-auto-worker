import { Test, TestingModule } from '@nestjs/testing';
import { CommandParserService } from '../../../src/parser/command.parser.service';
import { RunCommand } from '../../../src/parser/workflow.types';

describe('CommandParserService', () => {
  let service: CommandParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommandParserService],
    }).compile();

    service = module.get<CommandParserService>(CommandParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseRunCommands', () => {
    it('should parse single string command', () => {
      const runValue = 'npm install';
      const result = service.parseRunCommands(runValue);
      
      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('npm');
      expect(result[0].args).toEqual(['install']);
    });

    it('should parse array of commands', () => {
      const runValue = ['npm install', 'npm run build'];
      const result = service.parseRunCommands(runValue);
      
      expect(result).toHaveLength(2);
      expect(result[0].command).toBe('npm');
      expect(result[0].args).toEqual(['install']);
      expect(result[1].command).toBe('npm');
      expect(result[1].args).toEqual(['run', 'build']);
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        service.parseRunCommands(123 as any);
      }).toThrow('Invalid run command format');
    });
  });

  describe('parseSingleCommand', () => {
    it('should parse basic command with arguments', () => {
      const commandStr = 'git commit -m "Initial commit"';
      const result = service.parseRunCommands(commandStr)[0];
      
      expect(result.command).toBe('git');
      expect(result.args).toEqual(['commit', '-m', '"Initial commit"']);
    });

    it('should parse command with environment variables', () => {
      const commandStr = 'NODE_ENV=production npm start';
      const result = service.parseRunCommands(commandStr)[0];
      
      expect(result.command).toBe('npm');
      expect(result.args).toEqual(['start']);
      expect(result.env).toEqual({ NODE_ENV: 'production' });
    });

    it('should parse command with working directory', () => {
      const commandStr = 'npm install --cwd ./frontend';
      const result = service.parseRunCommands(commandStr)[0];
      
      expect(result.command).toBe('npm');
      expect(result.args).toEqual(['install']);
      expect(result.cwd).toBe('./frontend');
    });

    it('should parse command with timeout', () => {
      const commandStr = 'npm test --timeout 5000';
      const result = service.parseRunCommands(commandStr)[0];
      
      expect(result.command).toBe('npm');
      expect(result.args).toEqual(['test']);
      expect(result.timeout).toBe(5000);
    });

    it('should handle quoted arguments with spaces', () => {
      const commandStr = 'echo "Hello World"';
      const result = service.parseRunCommands(commandStr)[0];
      
      expect(result.command).toBe('echo');
      expect(result.args).toEqual(['Hello World']);
    });

    it('should handle mixed quotes', () => {
      const commandStr = 'echo "Hello" \'World\'';
      const result = service.parseRunCommands(commandStr)[0];
      
      expect(result.command).toBe('echo');
      expect(result.args).toEqual(['Hello', 'World']);
    });
  });

  describe('validateCommand', () => {
    it('should validate valid command', () => {
      const command: RunCommand = {
        command: 'npm',
        args: ['install'],
        cwd: './project',
        timeout: 300
      };
      
      const result = service.validateCommand(command);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty command', () => {
      const command: RunCommand = {
        command: '',
        args: ['install']
      };
      
      const result = service.validateCommand(command);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command cannot be empty');
    });

    it('should detect dangerous patterns', () => {
      const command: RunCommand = {
        command: 'rm -rf /',
        args: []
      };
      
      const result = service.validateCommand(command);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command contains potentially dangerous patterns');
    });

    it('should validate working directory path', () => {
      const command: RunCommand = {
        command: 'ls',
        args: [],
        cwd: '/etc/passwd'
      };
      
      const result = service.validateCommand(command);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid working directory path');
    });

    it('should validate timeout range', () => {
      const command: RunCommand = {
        command: 'sleep',
        args: ['10'],
        timeout: 0
      };
      
      const result = service.validateCommand(command);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout must be between 1 and 3600 seconds');
    });

    it('should validate environment variable names', () => {
      const command: RunCommand = {
        command: 'echo',
        args: [],
        env: { 'INVALID-NAME': 'value' }
      };
      
      const result = service.validateCommand(command);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid environment variable name: INVALID-NAME');
    });
  });

  describe('formatCommand', () => {
    it('should format basic command', () => {
      const command: RunCommand = {
        command: 'npm',
        args: ['install', 'lodash']
      };
      
      const result = service.formatCommand(command);
      
      expect(result).toBe('npm install lodash');
    });

    it('should quote arguments with spaces', () => {
      const command: RunCommand = {
        command: 'echo',
        args: ['Hello World', 'Test Message']
      };
      
      const result = service.formatCommand(command);
      
      expect(result).toBe('echo "Hello World" "Test Message"');
    });

    it('should handle arguments with quotes', () => {
      const command: RunCommand = {
        command: 'echo',
        args: ['"Quoted"', "'Single'"]
      };
      
      const result = service.formatCommand(command);
      
      expect(result).toBe('echo "\\"Quoted\\"" "\\'Single\\'"');
    });
  });

  describe('formatSequentialCommands', () => {
    it('should format multiple commands with &&', () => {
      const commands: RunCommand[] = [
        { command: 'npm', args: ['install'] },
        { command: 'npm', args: ['run', 'build'] }
      ];
      
      const result = service.formatSequentialCommands(commands);
      
      expect(result).toBe('npm install && npm run build');
    });
  });

  describe('edge cases', () => {
    it('should handle command with no arguments', () => {
      const command: RunCommand = { command: 'ls' };
      const result = service.formatCommand(command);
      expect(result).toBe('ls');
    });

    it('should handle command with empty args array', () => {
      const command: RunCommand = { command: 'ls', args: [] };
      const result = service.formatCommand(command);
      expect(result).toBe('ls');
    });
  });
});
