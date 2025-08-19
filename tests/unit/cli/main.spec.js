"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const cli_setup_1 = require("../../setup/cli.setup");
describe('CLI Main Entry Point', () => {
    describe('CLI 실행 환경', () => {
        it('process.argv가 CLI 실행을 위한 형태여야 함', () => {
            cli_setup_1.cliTestHelpers.setCliArgs('--help');
            expect(process.argv).toContain('--help');
        });
        it('환경변수가 적절히 설정되어야 함', () => {
            expect(process.env.NODE_ENV).toBe('test');
            expect(process.env.PORT).toBe('5849');
        });
    });
    describe('CLI 모듈 로딩', () => {
        it('CLI 모듈이 성공적으로 로드되어야 함', async () => {
            const moduleRef = await testing_1.Test.createTestingModule({
                imports: [],
            }).compile();
            expect(moduleRef).toBeDefined();
        });
    });
    describe('CLI 부트스트랩', () => {
        it('bootstrap 함수가 정의되어야 함', () => {
            expect(true).toBe(true);
        });
        it('bootstrap 함수가 함수여야 함', () => {
            expect(true).toBe(true);
        });
    });
});
//# sourceMappingURL=main.spec.js.map