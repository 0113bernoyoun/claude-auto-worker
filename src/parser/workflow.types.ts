export type WorkflowStep = {
  id: string;
  name?: string;
  type: string;
  depends_on?: string | string[];
  [key: string]: unknown;
};

export type WorkflowDefinition = {
  name: string;
  description?: string;
  version?: string;
  variables?: Record<string, unknown>;
  steps: WorkflowStep[];
  [key: string]: unknown;
};

export type ParsedWorkflow = {
  format: 'yaml' | 'json';
  path: string;
  workflow: WorkflowDefinition;
};


