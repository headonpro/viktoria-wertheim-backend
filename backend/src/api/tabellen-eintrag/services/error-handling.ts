/**
 * Error Handling Types and Utilities for Tabellen-Automatisierung
 * Centralized error management for all automation services
 */

export interface ErrorHandler {
  handleError(error: AutomationError): Promise<ErrorHandlingResult>;
  classifyError(error: Error): AutomationErrorType;
  shouldRetry(error: AutomationError): boolean;
  getRetryDelay(error: AutomationError, attemptNumber: number): number;
  logError(error: AutomationError, context: ErrorContext): void;
}

export interface AutomationError {
  type: AutomationErrorType;
  code: string;
  message: string;
  details: any;
  timestamp: Date;
  context: ErrorContext;
  originalError?: Error;
  retryable: boolean;
  severity: ErrorSeverity;
}

export interface ErrorContext {
  operation: string;
  ligaId?: number;
  saisonId?: number;
  jobId?: string;
  userId?: string;
  requestId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ErrorHandlingResult {
  handled: boolean;
  action: ErrorAction;
  retryAfter?: number;
  fallbackData?: any;
  notification?: ErrorNotification;
}

export interface ErrorNotification {
  type: NotificationType;
  recipients: string[];
  subject: string;
  message: string;
  priority: NotificationPriority;
}

export enum AutomationErrorType {
  // Validation Errors
  VALIDATION_ERROR = 'validation_error',
  INVALID_INPUT = 'invalid_input',
  BUSINESS_RULE_VIOLATION = 'business_rule_violation',
  
  // Database Errors
  DATABASE_ERROR = 'database_error',
  CONNECTION_ERROR = 'connection_error',
  TRANSACTION_ERROR = 'transaction_error',
  CONSTRAINT_VIOLATION = 'constraint_violation',
  
  // System Errors
  TIMEOUT_ERROR = 'timeout_error',
  MEMORY_ERROR = 'memory_error',
  CONCURRENCY_ERROR = 'concurrency_error',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  
  // Queue Errors
  QUEUE_ERROR = 'queue_error',
  JOB_TIMEOUT = 'job_timeout',
  JOB_CANCELLED = 'job_cancelled',
  QUEUE_FULL = 'queue_full',
  
  // Calculation Errors
  CALCULATION_ERROR = 'calculation_error',
  DATA_INCONSISTENCY = 'data_inconsistency',
  MISSING_DATA = 'missing_data',
  INVALID_STATE = 'invalid_state',
  
  // External Service Errors
  EXTERNAL_SERVICE_ERROR = 'external_service_error',
  NETWORK_ERROR = 'network_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  
  // Configuration Errors
  CONFIGURATION_ERROR = 'configuration_error',
  FEATURE_DISABLED = 'feature_disabled',
  PERMISSION_DENIED = 'permission_denied',
  
  // Unknown Errors
  UNKNOWN_ERROR = 'unknown_error',
  SYSTEM_ERROR = 'system_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorAction {
  RETRY = 'retry',
  RETRY_WITH_DELAY = 'retry_with_delay',
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  FALLBACK = 'fallback',
  FAIL_FAST = 'fail_fast',
  IGNORE = 'ignore',
  ESCALATE = 'escalate',
  ROLLBACK = 'rollback'
}

export enum NotificationType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  LOG = 'log',
  ADMIN_PANEL = 'admin_panel'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface FallbackStrategy {
  onCalculationFailure(context: ErrorContext): Promise<any>;
  onQueueOverload(context: ErrorContext): Promise<void>;
  onDatabaseUnavailable(context: ErrorContext): Promise<void>;
  onValidationFailure(context: ErrorContext): Promise<any>;
}

export interface RetryStrategy {
  maxRetries: number;
  backoffType: BackoffType;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  retryableErrors: AutomationErrorType[];
}

export enum BackoffType {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  CUSTOM = 'custom'
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<AutomationErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  retryRate: number;
  recoveryRate: number;
  averageRecoveryTime: number;
  lastError?: AutomationError;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  halfOpenMaxCalls: number;
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreaker {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  config: CircuitBreakerConfig;
}

// Error code constants for consistent error identification
export const ERROR_CODES = {
  // Validation
  NEGATIVE_SCORE: 'VAL_001',
  TEAM_AGAINST_ITSELF: 'VAL_002',
  MISSING_REQUIRED_FIELD: 'VAL_003',
  INVALID_STATUS_TRANSITION: 'VAL_004',
  INVALID_SPIELTAG_RANGE: 'VAL_005',
  
  // Database
  CONNECTION_FAILED: 'DB_001',
  TRANSACTION_FAILED: 'DB_002',
  CONSTRAINT_VIOLATION: 'DB_003',
  DEADLOCK_DETECTED: 'DB_004',
  
  // Queue
  QUEUE_FULL: 'QUEUE_001',
  JOB_TIMEOUT: 'QUEUE_002',
  JOB_CANCELLED: 'QUEUE_003',
  WORKER_UNAVAILABLE: 'QUEUE_004',
  
  // Calculation
  CALCULATION_TIMEOUT: 'CALC_001',
  DATA_INCONSISTENCY: 'CALC_002',
  MISSING_TEAM_DATA: 'CALC_003',
  INVALID_GAME_DATA: 'CALC_004',
  
  // System
  MEMORY_EXHAUSTED: 'SYS_001',
  CPU_OVERLOAD: 'SYS_002',
  DISK_FULL: 'SYS_003',
  SERVICE_UNAVAILABLE: 'SYS_004'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];