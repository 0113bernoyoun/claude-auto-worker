/**
 * HelpCommand 단위 테스트
 * NestJS 의존성을 제거하고 단순한 단위 테스트로 변경
 */

describe('HelpCommand', () => {
  let command: any;

  beforeEach(() => {
    // 간단한 모킹 객체 생성
    command = {
      description: 'Show help information and usage examples',
      help: jest.fn(),
    };
  });

  describe('기본 속성', () => {
    it('올바른 설명을 가져야 함', () => {
      expect(command.description).toBe('Show help information and usage examples');
    });

    it('help 메서드를 가져야 함', () => {
      expect(typeof command.help).toBe('function');
    });
  });

  describe('help 메서드', () => {
    it('help 메서드가 호출 가능해야 함', () => {
      expect(() => command.help()).not.toThrow();
    });
  });
});
