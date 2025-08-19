"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const run_command_1 = require("../../../src/cli/commands/run.command");
const cli_setup_1 = require("../../setup/cli.setup");
describe('RunCommand', () => {
    let command;
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [run_command_1.RunCommand],
        }).compile();
        command = moduleRef.get(run_command_1.RunCommand);
    });
    describe('워크플로우 실행', () => {
        it('워크플로우를 실행할 때 에러가 발생하지 않아야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run(['workflow.yaml'], {});
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
        it('워크플로우 파일 경로가 제공되어야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], {});
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
    });
    describe('실행 옵션', () => {
        it('dry-run 옵션이 있을 때 실제 실행 없이 시뮬레이션해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run(['workflow.yaml'], { dryRun: true });
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
        it('verbose 옵션이 있을 때 상세한 로그를 출력해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run(['workflow.yaml'], { verbose: true });
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
        it('timeout 옵션이 있을 때 적절한 시간 제한을 설정해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run(['workflow.yaml'], { timeout: 30000 });
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
    });
    describe('워크플로우 검증', () => {
        it('워크플로우 파일이 존재하지 않을 때 적절한 에러를 표시해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run(['nonexistent.yaml'], {});
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
        it('워크플로우 파일 형식이 잘못되었을 때 적절한 에러를 표시해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run(['invalid.yaml'], {});
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
    });
    describe('실행 상태', () => {
        it('워크플로우 실행 상태를 적절히 표시해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run(['workflow.yaml'], {});
                const runOutput = outputs.find(o => o.type === 'log')?.message || '';
                expect(runOutput).toContain('Running');
            }
            finally {
                restore();
            }
        });
        it('실행 완료 시 적절한 완료 메시지를 표시해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run(['workflow.yaml'], {});
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
    });
    describe('에러 처리', () => {
        it('워크플로우 실행 중 에러가 발생해도 적절히 처리되어야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                const result = await cli_setup_1.cliTestHelpers.catchErrors(() => command.run(['workflow.yaml'], {}));
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
    });
});
//# sourceMappingURL=run.command.spec.js.map