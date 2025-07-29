/**
 * Spiel Services Index
 * Export point for spiel-related automation services
 */

// Export validation service types and implementation
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
} from './validation';

export { SpielValidationService } from './validation';

// Export lifecycle types
export type {
  SpielLifecycle,
  LifecycleEvent,
  QueryParams,
  LifecycleContext,
  LifecycleOperation,
  TriggerCondition,
  HookConfiguration,
  HookCondition,
  HookResult,
  Priority
} from '../lifecycles';

// Re-export common types from tabellen-eintrag services
export type {
  ServiceResponse,
  FilterOptions,
  PerformanceMetrics,
  AuditLogEntry
} from '../../tabellen-eintrag/services/types';