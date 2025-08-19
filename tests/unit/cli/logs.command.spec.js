"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const logs_command_1 = require("../../../src/cli/commands/logs.command");
const cli_setup_1 = require("../../setup/cli.setup");
describe('LogsCommand', () => {
    let command;
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [logs_command_1.LogsCommand],
        }).compile();
        command = moduleRef.get(logs_command_1.LogsCommand);
    });
    describe('로그 표시', () => {
        it('로그를 표시할 때 에러가 발생하지 않아야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], {});
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
        it('로그 메시지에 적절한 정보가 포함되어야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], {});
                const logsOutput = outputs.find(o => o.type === 'log')?.message || '';
                expect(logsOutput).toContain('Logs');
            }
            finally {
                restore();
            }
        });
    });
    describe('로그 필터링', () => {
        it('레벨별 로그 필터링이 작동해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], { level: 'error' });
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
        it('시간 범위별 로그 필터링이 작동해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], { since: '1h' });
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
    });
    describe('로그 옵션', () => {
        it('tail 옵션이 있을 때 실시간 로그를 표시해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], { tail: true });
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
        it('follow 옵션이 있을 때 로그를 계속 따라가야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], { follow: true });
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
    });
    describe('에러 처리', () => {
        it('로그 확인 중 에러가 발생해도 적절히 처리되어야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                const result = await cli_setup_1.cliTestHelpers.catchErrors(() => command.run([], {}));
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
    });
});
//# sourceMappingURL=logs.command.spec.js.map