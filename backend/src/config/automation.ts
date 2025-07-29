/**
 * Configuration for Tabellen-Automatisierung
 * Central configuration for queue, caching, and automation settings
 */

export interface AutomationConfig {
  queue: QueueConfig;
  cache: CacheConfig;
  calculation: CalculationConfig;
  snapshot: SnapshotConfig;
  monitoring: MonitoringConfig;
  errorHandling: ErrorHandlingConfig;
  features: FeatureFlags;
}

export interface QueueConfig {
  enabled: boolean;
  concurrency: number;
  maxRetries: number;
  retryDelay: number;
  jobTimeout: number;
  cleanupInterval: number;
  maxCompletedJobs: number;
  maxFailedJobs: number;
  priority: {
    default: Priority;
    manual: Priority;
    gameResult: Priority;
    scheduled: Priority;
  };
  backoff: {
    type: 'linear' | 'exponential';
    delay: number;
    maxDelay: number;
  };
}

export interface CacheConfig {
  enabled: boolean;
  provider: 'memory' | 'redis';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  ttl: {
    tableData: number; // seconds
    teamStats: number;
    queueStatus: number;
    snapshots: number;
  };
  keyPrefix: string;
  compression: boolean;
  serialization: 'json' | 'msgpack';
}

export interface CalculationConfig {
  timeout: number;
  batchSize: number;
  parallelCalculations: boolean;
  validateResults: boolean;
  createSnapshots: boolean;
  performance: {
    maxTeamsPerLiga: number;
    maxGamesPerCalculation: number;
    warningThreshold: number; // milliseconds
    errorThreshold: number; // milliseconds
  };
  sorting: {
    criteria: SortingCriteria;
    tiebreakers: string[];
  };
}

export interface SnapshotConfig {
  enabled: boolean;
  storageDirectory: string;
  maxSnapshots: number;
  maxAge: number; // days
  compression: boolean;
  checksumValidation: boolean;
  autoCleanup: boolean;
  cleanupInterval: number; // hours
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsCollection: boolean;
  healthChecks: {
    enabled: boolean;
    interval: number; // seconds
    timeout: number; // seconds
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    structured: boolean;
    includeStackTrace: boolean;
  };
  alerts: {
    enabled: boolean;
    channels: AlertChannel[];
    thresholds: AlertThresholds;
  };
}

export interface ErrorHandlingConfig {
  retryStrategy: RetryStrategyConfig;
  circuitBreaker: CircuitBreakerConfig;
  fallback: FallbackConfig;
  notifications: NotificationConfig;
}

export interface RetryStrategyConfig {
  maxRetries: number;
  backoffType: 'fixed' | 'linear' | 'exponential';
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  halfOpenMaxCalls: number;
}

export interface FallbackConfig {
  enabled: boolean;
  strategies: {
    calculationFailure: 'rollback' | 'manual' | 'ignore';
    queueOverload: 'pause' | 'prioritize' | 'scale';
    databaseUnavailable: 'readonly' | 'cache' | 'fail';
  };
}

export interface NotificationConfig {
  enabled: boolean;
  channels: {
    email: EmailConfig;
    slack: SlackConfig;
    webhook: WebhookConfig;
  };
  rules: NotificationRule[];
}

export interface EmailConfig {
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
  recipients: string[];
}

export interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
  channel: string;
  username: string;
  iconEmoji: string;
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  timeout: number;
}

export interface NotificationRule {
  name: string;
  condition: {
    errorType?: string[];
    severity?: string[];
    component?: string[];
  };
  channels: string[];
  throttle: number; // minutes
  template: string;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook';
  config: any;
}

export interface AlertThresholds {
  errorRate: number; // percentage
  responseTime: number; // milliseconds
  queueLength: number;
  failedJobs: number;
  memoryUsage: number; // percentage
}

export interface FeatureFlags {
  automaticCalculation: boolean;
  queueProcessing: boolean;
  snapshotCreation: boolean;
  adminExtensions: boolean;
  performanceMonitoring: boolean;
  caching: boolean;
  circuitBreaker: boolean;
  notifications: boolean;
}

export enum Priority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface SortingCriteria {
  punkte: 'desc';
  tordifferenz: 'desc';
  tore_fuer: 'desc';
  team_name: 'asc';
}

// Default configuration
export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  queue: {
    enabled: true,
    concurrency: 3,
    maxRetries: 3,
    retryDelay: 2000,
    jobTimeout: 30000,
    cleanupInterval: 3600000, // 1 hour
    maxCompletedJobs: 100,
    maxFailedJobs: 50,
    priority: {
      default: Priority.NORMAL,
      manual: Priority.HIGH,
      gameResult: Priority.HIGH,
      scheduled: Priority.LOW
    },
    backoff: {
      type: 'exponential',
      delay: 1000,
      maxDelay: 30000
    }
  },
  cache: {
    enabled: process.env.ENABLE_CACHING !== 'false',
    provider: process.env.REDIS_HOST ? 'redis' : 'memory',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    },
    ttl: {
      tableData: 300, // 5 minutes
      teamStats: 600, // 10 minutes
      queueStatus: 30, // 30 seconds
      snapshots: 3600 // 1 hour
    },
    keyPrefix: 'tabellen_automation:',
    compression: false,
    serialization: 'json'
  },
  calculation: {
    timeout: 30000,
    batchSize: 50,
    parallelCalculations: true,
    validateResults: true,
    createSnapshots: true,
    performance: {
      maxTeamsPerLiga: 20,
      maxGamesPerCalculation: 500,
      warningThreshold: 5000,
      errorThreshold: 15000
    },
    sorting: {
      criteria: {
        punkte: 'desc',
        tordifferenz: 'desc',
        tore_fuer: 'desc',
        team_name: 'asc'
      },
      tiebreakers: ['punkte', 'tordifferenz', 'tore_fuer', 'team_name']
    }
  },
  snapshot: {
    enabled: true,
    storageDirectory: './snapshots',
    maxSnapshots: 50,
    maxAge: 30,
    compression: true,
    checksumValidation: true,
    autoCleanup: true,
    cleanupInterval: 24 // hours
  },
  monitoring: {
    enabled: true,
    metricsCollection: true,
    healthChecks: {
      enabled: true,
      interval: 30,
      timeout: 5
    },
    logging: {
      level: 'info',
      structured: true,
      includeStackTrace: false
    },
    alerts: {
      enabled: true,
      channels: [],
      thresholds: {
        errorRate: 5, // 5%
        responseTime: 10000, // 10 seconds
        queueLength: 100,
        failedJobs: 10,
        memoryUsage: 80 // 80%
      }
    }
  },
  errorHandling: {
    retryStrategy: {
      maxRetries: 3,
      backoffType: 'exponential',
      baseDelay: 1000,
      maxDelay: 30000,
      jitter: true,
      retryableErrors: ['database_error', 'timeout_error', 'concurrency_error']
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringWindow: 300000,
      halfOpenMaxCalls: 3
    },
    fallback: {
      enabled: true,
      strategies: {
        calculationFailure: 'rollback',
        queueOverload: 'pause',
        databaseUnavailable: 'readonly'
      }
    },
    notifications: {
      enabled: false,
      channels: {
        email: {
          enabled: false,
          smtp: {
            host: '',
            port: 587,
            secure: false,
            auth: { user: '', pass: '' }
          },
          from: '',
          recipients: []
        },
        slack: {
          enabled: false,
          webhookUrl: '',
          channel: '#alerts',
          username: 'Tabellen Bot',
          iconEmoji: ':soccer:'
        },
        webhook: {
          enabled: false,
          url: '',
          method: 'POST',
          headers: {},
          timeout: 5000
        }
      },
      rules: []
    }
  },
  features: {
    automaticCalculation: true,
    queueProcessing: true,
    snapshotCreation: true,
    adminExtensions: true,
    performanceMonitoring: true,
    caching: true,
    circuitBreaker: true,
    notifications: false
  }
};