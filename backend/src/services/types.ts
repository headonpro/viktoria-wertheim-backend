/**
 * Service Types
 * 
 * Common type definitions for the services layer
 */

// Hook-related types
export interface HookEvent {
  contentType: string;
  operation: string;
  data: any;
  result?: any;
  error?: Error;
  timestamp: Date;
}

export interface HookResult {
  success: boolean;
  data?: any;
  error?: Error;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface HookConfiguration {
  enabled: boolean;
  priority: number;
  timeout: number;
  retries: number;
  async: boolean;
  conditions?: HookCondition[];
  metadata?: Record<string, any>;
}

export interface HookCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
}

export interface HookContext {
  contentType: string;
  operation: string;
  data: any;
  hookType: string;
  event: HookEvent;
  operationId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface HookMetrics {
  beforeCreate: {
    count: number;
    averageTime: number;
    errorRate: number;
    timeoutRate?: number;
  };
  afterCreate: {
    count: number;
    averageTime: number;
    errorRate: number;
  };
  beforeUpdate: {
    count: number;
    averageTime: number;
    errorRate: number;
  };
  afterUpdate: {
    count: number;
    averageTime: number;
    errorRate: number;
  };
  beforeDelete: {
    count: number;
    averageTime: number;
    errorRate: number;
  };
  afterDelete: {
    count: number;
    averageTime: number;
    errorRate: number;
  };
}

// Validation types
export interface ValidationRule {
  name: string;
  description: string;
  type: 'critical' | 'warning' | 'info';
  enabled: boolean;
  priority: number;
  validator: (data: any, context?: ValidationContext) => boolean | Promise<boolean>;
  message: string;
  field?: string;
  dependencies?: string[];
  conditions?: ValidationCondition[];
}

export interface ValidationResult {
  isValid: boolean;
  canProceed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  executionTime: number;
  rulesExecuted: number;
  rulesFailed: number;
  rulesSkipped: number;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  type: 'critical' | 'warning';
  context?: ValidationContext;
  timestamp: Date;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  context?: ValidationContext;
  timestamp: Date;
}

export interface ValidationContext {
  contentType: string;
  operation: 'create' | 'update' | 'delete';
  hookType: string;
  operationId: string;
  entityId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  // Dynamic properties that can be added by validation rules
  [key: string]: any;
}

export interface ValidationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'exists';
  value: any;
}

export interface ValidationMetrics {
  totalRules: number;
  executedRules: number;
  passedRules: number;
  failedRules: number;
  skippedRules: number;
  averageExecutionTime: number;
  errorRate: number;
}

// Calculation types
export interface SyncCalculation {
  name: string;
  description: string;
  priority: number;
  dependencies: string[];
  calculator: (data: any, context: CalculationContext) => any;
  fallback?: any;
  timeout?: number;
}

export interface AsyncCalculation {
  name: string;
  description: string;
  priority: number;
  dependencies: string[];
  calculator: (data: any, context: CalculationContext) => Promise<any>;
  fallback?: any;
  timeout?: number;
  retries?: number;
}

export interface CalculationResult {
  name: string;
  value: any;
  success: boolean;
  error?: Error;
  executionTime: number;
  timestamp: Date;
}

export interface BatchCalculationResult {
  success: boolean;
  results: Record<string, any>;
  errors: CalculationError[];
  warnings: CalculationWarning[];
  executionTime: number;
  timestamp: Date;
}

export interface CalculationError {
  field: string;
  message: string;
  code: string;
  timestamp: Date;
}

export interface CalculationWarning {
  field: string;
  message: string;
  code: string;
  timestamp: Date;
}

export interface CalculationContext {
  contentType: string;
  operation: string;
  hookType: string;
  operationId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CalculationStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: Error;
  result?: any;
  completedAt?: Date;
  name?: string;
}

// Job Management types
export interface JobConfig {
  name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeout: number;
  retries: number;
  delay?: number;
  cron?: string;
}

export interface QueueStatistics {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
}

// System Configuration types
export interface HookSystemConfiguration {
  enabled: boolean;
  defaultTimeout: number;
  maxRetries: number;
  enableMetrics: boolean;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  hooks: Record<string, HookConfiguration>;
}