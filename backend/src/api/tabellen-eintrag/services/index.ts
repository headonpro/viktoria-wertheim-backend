/**
 * Services Index for Tabellen-Automatisierung
 * Central export point for all automation services
 */

// Export all types
export * from './types';

// Export service implementations
export { 
  TabellenBerechnungsServiceImpl, 
  createTabellenBerechnungsService 
} from './tabellen-berechnung';

export { SnapshotServiceImpl } from './snapshot';

// Service factory interface (to be implemented in later tasks)
export interface ServiceFactory {
  createValidationService(): import('./types').ValidationService;
  createQueueManager(): import('./types').QueueManager;
  createTabellenBerechnungsService(): import('./types').TabellenBerechnungsService;
  createSnapshotService(): import('./types').SnapshotService;
  createErrorHandler(): import('./types').ErrorHandler;
  createLifecycleHooks(): import('./types').SpielLifecycle;
}

// Service registry interface (to be implemented in later tasks)
export interface ServiceRegistry {
  register<T>(name: string, service: T): void;
  get<T>(name: string): T;
  has(name: string): boolean;
  unregister(name: string): void;
  clear(): void;
}

// Service health interface
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  details?: Record<string, any>;
}

// Service manager interface (to be implemented in later tasks)
export interface ServiceManager {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getHealth(): Promise<ServiceHealth[]>;
  restart(serviceName: string): Promise<void>;
}

// Constants for service names
export const SERVICE_NAMES = {
  VALIDATION: 'validation',
  QUEUE_MANAGER: 'queueManager',
  TABLE_CALCULATION: 'tableCalculation',
  SNAPSHOT: 'snapshot',
  ERROR_HANDLER: 'errorHandler',
  LIFECYCLE_HOOKS: 'lifecycleHooks'
} as const;

export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];

// Event types for service communication
export interface ServiceEvent {
  type: string;
  source: ServiceName;
  data: any;
  timestamp: Date;
  correlationId?: string;
}

export interface ServiceEventHandler {
  handle(event: ServiceEvent): Promise<void>;
}

export interface ServiceEventBus {
  emit(event: ServiceEvent): Promise<void>;
  subscribe(eventType: string, handler: ServiceEventHandler): void;
  unsubscribe(eventType: string, handler: ServiceEventHandler): void;
}

// Service configuration validation
export interface ConfigValidator {
  validate(config: import('./types').AutomationConfig): ConfigValidationResult;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value: any;
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
  value: any;
}