export interface LoggingConfig {
  // 로그 레벨별 저장 제어
  levels: {
    debug: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
  };
  
  // 로그 저장 옵션
  storage: {
    enabled: boolean;
    maxFileSize: string; // 예: "100MB", "1GB"
    maxFiles: number; // 보관할 로그 파일 수
    compression: boolean; // 압축 여부
    rotation: {
      enabled: boolean;
      interval: string; // 예: "1d", "1w", "1M"
    };
  };
  
  // 로그 표시 옵션
  display: {
    defaultLines: number;
    maxLines: number; // 최대 표시 라인 수
    showInvalidJson: boolean; // invalid JSON 라인 표시 여부
    invalidJsonWarning: boolean; // invalid JSON 경고 표시 여부
  };
  
  // 시간 파싱 옵션
  timeParsing: {
    supportCompoundUnits: boolean; // "2h30m" 같은 복합 단위 지원
    defaultUnit: string; // 기본 시간 단위
  };
}

export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  levels: {
    debug: true,
    info: true,
    warn: true,
    error: true,
  },
  storage: {
    enabled: true,
    maxFileSize: "100MB",
    maxFiles: 10,
    compression: true,
    rotation: {
      enabled: true,
      interval: "1d",
    },
  },
  display: {
    defaultLines: 50,
    maxLines: 10000,
    showInvalidJson: false,
    invalidJsonWarning: true,
  },
  timeParsing: {
    supportCompoundUnits: true,
    defaultUnit: "h",
  },
};
