/** @type {import('jest').Config} */
const config = {
  displayName: 'CLI Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit/cli'],
  testMatch: [
    '**/tests/unit/cli/**/*.spec.ts',
    '**/tests/unit/cli/**/*.test.ts'
  ],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: 'tsconfig.cli.json',
      // NestJS 데코레이터 지원을 위한 설정
      useESM: false,
      experimentalDecorators: true,
      emitDecoratorMetadata: true
    }]
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  collectCoverageFrom: [
    'src/cli/**/*.(t|j)s',
    '!src/cli/**/*.d.ts'
  ],
  coverageDirectory: 'coverage/cli',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/cli.setup.ts'],
  testTimeout: 10000,
  // CLI 테스트를 위한 특별한 설정
  testEnvironmentOptions: {
    url: 'http://localhost:5849'
  },
  // CLI 명령어 실행을 위한 모킹 설정
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@cli/(.*)$': '<rootDir>/src/cli/$1'
  },
  // CLI 테스트에서 process.argv 모킹을 위한 설정
  transformIgnorePatterns: [
    'node_modules/(?!nest-commander|@nestjs)'
  ]
};

module.exports = config;
