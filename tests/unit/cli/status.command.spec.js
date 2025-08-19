"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const status_command_1 = require("../../../src/cli/commands/status.command");
const cli_setup_1 = require("../../setup/cli.setup");
describe('StatusCommand', () => {
    let command;
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [status_command_1.StatusCommand],
        }).compile();
        command = moduleRef.get(status_command_1.StatusCommand);
    });
    describe('상태 확인', () => {
        it('상태를 표시할 때 에러가 발생하지 않아야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], {});
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
        it('상태 메시지에 적절한 정보가 포함되어야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], {});
                const statusOutput = outputs.find(o => o.type === 'log')?.message || '';
                expect(statusOutput).toContain('Status');
            }
            finally {
                restore();
            }
        });
    });
    describe('상세 상태', () => {
        it('상세 옵션이 있을 때 더 많은 정보를 표시해야 함', async () => {
            const { outputs, restore } = cli_setup_1.cliTestHelpers.captureConsoleOutput();
            try {
                await command.run([], { detailed: true });
                expect(outputs.some(o => o.type === 'log')).toBe(true);
            }
            finally {
                restore();
            }
        });
    });
    describe('에러 처리', () => {
        it('상태 확인 중 에러가 발생해도 적절히 처리되어야 함', async () => {
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
//# sourceMappingURL=status.command.spec.js.map