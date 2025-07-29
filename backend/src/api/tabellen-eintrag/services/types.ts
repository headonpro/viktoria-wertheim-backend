/**
 * Central Types Export for Tabellen-Automatisierung
 * Re-exports all interfaces and types for easy importing
 */

// Validation Service Types
export type {
  ValidationService,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationErrorCode,
  ValidationWarningCode,
  SpielEntity,
  Liga,
  Saison,
  Team,
  SpielStatus,
  CalculationStatus
} from '../../spiel/services/validation';

// Queue Manager Types
export type {
  QueueManager,
  CalculationJob,
  QueueStatus,
  QueueConfiguration,
  JobId,
  Priority,
  JobStatus,
  JobResult,
  RetryConfig,
  JobMetrics
} from './queue-manager';

// Table Calculation Types
export type {
  TabellenBerechnungsService,
  TeamStats,
  TabellenEintrag,
  CalculationContext,
  CalculationTrigger,
  SortingCriteria,
  CalculationResult,
  CalculationError,
  CalculationWarning,
  CalculationErrorType,
  CalculationWarningType
} from './tabellen-berechnung';

// Snapshot Service Types
export type {
  SnapshotService,
  Snapshot,
  SnapshotMetadata,
  SnapshotConfiguration,
  RestoreResult,
  RestoreError,
  RestoreErrorType,
  SnapshotId
} from './snapshot';

// Error Handling Types
export type {
  ErrorHandler,
  AutomationError,
  ErrorContext,
  ErrorHandlingResult,
  ErrorNotification,
  AutomationErrorType,
  ErrorSeverity,
  ErrorAction,
  NotificationType,
  NotificationPriority,
  FallbackStrategy,
  RetryStrategy,
  BackoffType,
  ErrorMetrics,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitBreaker,
  ErrorCode
} from './error-handling';

// Lifecycle Types
export type {
  SpielLifecycle,
  LifecycleEvent,
  QueryParams,
  LifecycleContext,
  LifecycleOperation,
  TriggerCondition,
  HookConfiguration,
  HookCondition,
  HookResult
} from '../../spiel/lifecycles';

// Admin Extension Types
export type {
  AdminExtension,
  AdminAPI,
  RecalculationRequest,
  RecalculationResponse,
  CurrentJob,
  CalculationHistoryEntry,
  SystemHealth,
  ComponentHealth,
  ComponentMetrics,
  SystemStatus,
  ComponentStatus,
  AutomationSettings,
  LogLevel
} from '../../../admin/extensions/tabellen-automatisierung/types';

// Configuration Types
export type {
  AutomationConfig,
  QueueConfig,
  CacheConfig,
  CalculationConfig,
  SnapshotConfig,
  MonitoringConfig,
  ErrorHandlingConfig,
  RetryStrategyConfig,
  FallbackConfig,
  NotificationConfig,
  EmailConfig,
  SlackConfig,
  WebhookConfig,
  NotificationRule,
  AlertChannel,
  AlertThresholds,
  FeatureFlags
} from '../../../config/automation';

// Export the default config
export { DEFAULT_AUTOMATION_CONFIG } from '../../../config/automation';

// Common utility types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FilterOptions {
  ligaId?: number;
  saisonId?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface BulkOperation<T = any> {
  operation: 'create' | 'update' | 'delete';
  data: T[];
  options?: {
    validateAll?: boolean;
    stopOnError?: boolean;
    batchSize?: number;
  };
}

export interface BulkOperationResult<T = any> {
  success: boolean;
  processed: number;
  failed: number;
  results: T[];
  errors: BulkOperationError[];
  warnings: BulkOperationWarning[];
}

export interface BulkOperationError {
  index: number;
  data: any;
  error: string;
  code: string;
}

export interface BulkOperationWarning {
  index: number;
  data: any;
  warning: string;
  code: string;
}

// Database transaction types
export interface TransactionContext {
  id: string;
  startTime: Date;
  operations: TransactionOperation[];
  status: TransactionStatus;
}

export interface TransactionOperation {
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: Date;
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMMITTED = 'committed',
  ROLLED_BACK = 'rolled_back',
  FAILED = 'failed'
}

// Performance monitoring types
export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  duration: {
    warning: number;
    error: number;
  };
  memory: {
    warning: number;
    error: number;
  };
  cpu: {
    warning: number;
    error: number;
  };
}

// Audit logging types
export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  CALCULATE = 'calculate',
  ROLLBACK = 'rollback',
  SNAPSHOT = 'snapshot',
  QUEUE_JOB = 'queue_job'
}

// Feature flag types
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  conditions?: FeatureFlagCondition[];
  rolloutPercentage?: number;
  metadata?: Record<string, any>;
}

export interface FeatureFlagCondition {
  type: 'user' | 'environment' | 'time' | 'custom';
  operator: 'equals' | 'in' | 'greater_than' | 'less_than';
  value: any;
}

// Health check types
export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message?: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

// Rate limiting types
export interface RateLimit {
  key: string;
  limit: number;
  window: number; // seconds
  current: number;
  resetTime: Date;
}

export interface RateLimitConfig {
  enabled: boolean;
  rules: RateLimitRule[];
}

export interface RateLimitRule {
  name: string;
  pattern: string;
  limit: number;
  window: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}