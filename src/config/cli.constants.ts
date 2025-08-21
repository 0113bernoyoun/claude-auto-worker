/**
 * CLI 명령어에서 사용하는 공통 상수들
 */

export const CLI_CONSTANTS = {
  // 파일 처리 관련 상수
  BUFFER_SIZE: 8192, // 8KB
  LARGE_FILE_THRESHOLD: 10 * 1024 * 1024, // 10MB
  
  // 진행률 바 관련 상수
  PROGRESS_BAR_WIDTH: {
    DEFAULT: 30,
    COMPACT: 20,
    DETAILED: 40
  },
  
  // 시간 파싱 관련 상수
  TIME_UNITS: {
    SECONDS: 1000,
    MINUTES: 60 * 1000,
    HOURS: 60 * 60 * 1000,
    DAYS: 24 * 60 * 60 * 1000
  },
  
  // 출력 형식 관련 상수
  OUTPUT_FORMATS: {
    DETAILED: 'detailed',
    SUMMARY: 'summary',
    JSON: 'json',
    TABLE: 'table'
  },
  
  // 로그 레벨 관련 상수
  LOG_LEVELS: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  }
} as const;
