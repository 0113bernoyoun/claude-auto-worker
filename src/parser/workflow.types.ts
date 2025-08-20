export type WorkflowStep = {
  id: string;
  name?: string;
  type: string;
  depends_on?: string | string[];
  prompt?: string;
  run?: string | string[];
  branch?: string;
  policy?: WorkflowPolicy;
  [key: string]: unknown;
};

export type WorkflowPolicy = {
  retry?: {
    max_attempts: number;
    delay_ms: number;
    backoff_multiplier?: number;
  };
  timeout?: {
    seconds: number;
  };
  rollback?: {
    enabled: boolean;
    steps?: string[];
  };
  [key: string]: unknown;
};

export type WorkflowDefinition = {
  name: string;
  description?: string;
  version?: string;
  variables?: Record<string, unknown>;
  stages?: WorkflowStage[];
  steps: WorkflowStep[];
  [key: string]: unknown;
};

export type WorkflowStage = {
  id: string;
  name?: string;
  description?: string;
  steps: string[];
  depends_on?: string | string[];
  parallel?: boolean;
  [key: string]: unknown;
};

export type ParsedWorkflow = {
  format: 'yaml' | 'json';
  path: string;
  workflow: WorkflowDefinition;
};

export type PromptTemplate = {
  template: string;
  variables: Record<string, unknown>;
  [key: string]: unknown;
};

export type RunCommand = {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  [key: string]: unknown;
};


