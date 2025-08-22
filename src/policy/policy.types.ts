export interface SecurityPolicy {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  rules: SecurityRule[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SecurityRule {
  id: string;
  name: string;
  type: RuleType;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  metadata?: Record<string, unknown>;
}

export enum RuleTypeEnum {
  CommandFilter = 'command_filter',
  PathRestriction = 'path_restriction',
  FileSizeLimit = 'file_size_limit',
  SensitiveData = 'sensitive_data',
  ExecutionTime = 'execution_time',
  ResourceUsage = 'resource_usage',
  Custom = 'custom',
}

export type RuleType = `${RuleTypeEnum}`;

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | number | boolean | string[];
  caseSensitive?: boolean;
}

export interface RuleAction {
  type: 'block' | 'warn' | 'log' | 'notify' | 'rollback' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyViolation {
  id: string;
  policyId: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: PolicyContext;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

export interface PolicyContext {
  workflowId?: string;
  stepId?: string;
  command?: string;
  filePath?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyValidationResult {
  isValid: boolean;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  recommendations: string[];
  summaryCode?: string; // optional short code for UI usage (e.g., 'OK', 'WARN', 'BLOCK')
  category?: string; // optional category for dashboard grouping
}

export interface PolicyApproval {
  id: string;
  policyId: string;
  workflowId: string;
  stepId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  reason?: string;
  expiresAt: Date;
}

export interface PolicyChangeRequest {
  id: string;
  policyId: string;
  type: 'create' | 'update' | 'delete' | 'enable' | 'disable';
  changes: Record<string, unknown>;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  reason?: string;
}

export interface PolicyAuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

