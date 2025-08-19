"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const cli_module_1 = require("../../../src/cli/cli.module");
const config_command_1 = require("../../../src/cli/commands/config.command");
const help_command_1 = require("../../../src/cli/commands/help.command");
const logs_command_1 = require("../../../src/cli/commands/logs.command");
const run_command_1 = require("../../../src/cli/commands/run.command");
const status_command_1 = require("../../../src/cli/commands/status.command");
const error_handler_service_1 = require("../../../src/cli/services/error-handler.service");
describe('CliModule', () => {
    let module;
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [cli_module_1.CliModule],
        }).compile();
        module = moduleRef.get(cli_module_1.CliModule);
    });
    describe('모듈 구성', () => {
        it('모듈이 성공적으로 생성되어야 함', () => {
            expect(module).toBeDefined();
        });
        it('모든 CLI 명령어가 등록되어야 함', async () => {
            const moduleRef = await testing_1.Test.createTestingModule({
                imports: [cli_module_1.CliModule],
            }).compile();
            expect(moduleRef.get(config_command_1.ConfigCommand)).toBeDefined();
            expect(moduleRef.get(help_command_1.HelpCommand)).toBeDefined();
            expect(moduleRef.get(status_command_1.StatusCommand)).toBeDefined();
            expect(moduleRef.get(logs_command_1.LogsCommand)).toBeDefined();
            expect(moduleRef.get(run_command_1.RunCommand)).toBeDefined();
        });
        it('에러 핸들러 서비스가 등록되어야 함', async () => {
            const moduleRef = await testing_1.Test.createTestingModule({
                imports: [cli_module_1.CliModule],
            }).compile();
            expect(moduleRef.get(error_handler_service_1.ErrorHandlerService)).toBeDefined();
        });
    });
    describe('의존성 주입', () => {
        it('모든 명령어가 필요한 의존성을 주입받아야 함', async () => {
            const moduleRef = await testing_1.Test.createTestingModule({
                imports: [cli_module_1.CliModule],
            }).compile();
            const configCommand = moduleRef.get(config_command_1.ConfigCommand);
            const helpCommand = moduleRef.get(help_command_1.HelpCommand);
            const statusCommand = moduleRef.get(status_command_1.StatusCommand);
            const logsCommand = moduleRef.get(logs_command_1.LogsCommand);
            const runCommand = moduleRef.get(run_command_1.RunCommand);
            expect(configCommand).toBeDefined();
            expect(helpCommand).toBeDefined();
            expect(statusCommand).toBeDefined();
            expect(logsCommand).toBeDefined();
            expect(runCommand).toBeDefined();
        });
    });
    describe('모듈 초기화', () => {
        it('모듈 초기화 시 에러가 발생하지 않아야 함', async () => {
            const moduleRef = await testing_1.Test.createTestingModule({
                imports: [cli_module_1.CliModule],
            }).compile();
            await expect(moduleRef.init()).resolves.not.toThrow();
        });
    });
});
//# sourceMappingURL=cli.module.spec.js.map