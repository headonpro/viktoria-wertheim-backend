# API Documentation

## Overview

This document provides comprehensive API documentation for all services in the refactored lifecycle hooks system. Each service exposes a well-defined interface that can be used for testing, monitoring, and integration.

## Core Service APIs

### HookServiceFactory

**Location**: `backend/src/services/HookServiceFactory.ts`

The central factory for creating and managing hook service instances.

#### Interface

```typescript
interface HookServiceFactory {
  createTeamService(): TeamHookService
  createSaisonService(): SaisonHookService
  createTableService(): TableHookService
  getConfig(): HookConfiguration
  registerService(name: string, service: BaseHookService): void
  getService(name: string): BaseHookService | null
}
```

#### Methods

##### `createTeamService(): TeamHookService`
Creates a new instance of the team hook service.

**Returns**: `TeamHookService` - Configured team service instance
**Throws**: `ServiceCreationError` - If service creation fails

##### `createSaisonService(): SaisonHookService`
Creates a new instance of the season hook service.

**Returns**: `SaisonHookService` - Configured season service instance
**Throws**: `ServiceCreationError` - If service creation fails

##### `createTableService(): TableHookService`
Creates a new instance of the table hook service.

**Returns**: `TableHookService` - Configured table service instance
**Throws**: `ServiceCreationError` - If service creation fails

##### `getConfig(): HookConfiguration`
Retrieves the current hook configuration.

**Returns**: `HookConfiguration` - Current configuration object
**Throws**: `ConfigurationError` - If configuration cannot be loaded

### BaseHookService

**Location**: `backend/src/services/BaseHookService.ts`

Abstract base class providing common functionality for all hook services.

#### Interface

```typescript
abstract class BaseHookService {
  abstract beforeCreate(event: HookEvent): Promise<HookResult>
  abstract beforeUpdate(event: HookEvent): Promise<HookResult>
  abstract afterCreate(event: HookEvent): Promise<void>
  abstract afterUpdate(event: HookEvent): Promise<void>
  
  protected executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T>
  protected handleError(error: Error, context: HookContext): HookResult
  protected logExecution(operation: string, duration: number): void
}
```

#### Data Types

```typescript
interface HookEvent {
  type: 'beforeCreate' | 'beforeUpdate' | 'afterCreate' | 'afterUpdate'
  contentType: string
  data: any
  where?: any
  params: any
  timestamp: Date
}

interface HookResult {
  success: boolean
  canProceed: boolean
  modifiedData?: any
  errors: HookError[]
  warnings: HookWarning[]
  executionTime: number
}

interface HookContext {
  contentType: string
  operation: string
  userId?: string
  requestId: string
}
```

### ValidationService

**Location**: `backend/src/services/ValidationService.ts`

Handles all validation operations with configurable rules.

#### Interface

```typescript
interface ValidationService {
  validateCritical(data: any, rules: ValidationRule[]): Promise<ValidationResult>
  validateWarning(data: any, rules: ValidationRule[]): Promise<ValidationResult>
  isValidationEnabled(ruleName: string): boolean
  getRules(contentType: string): ValidationRule[]
  addRule(rule: ValidationRule): void
  removeRule(ruleName: string): void
}
```

#### Methods

##### `validateCritical(data: any, rules: ValidationRule[]): Promise<ValidationResult>`
Executes critical validation rules that can block operations.

**Parameters**:
- `data: any` - Data to validate
- `rules: ValidationRule[]` - Array of validation rules to apply

**Returns**: `Promise<ValidationResult>` - Validation results
**Throws**: `ValidationError` - If validation system fails

##### `validateWarning(data: any, rules: ValidationRule[]): Promise<ValidationResult>`
Executes warning validation rules that log issues but don't block operations.

**Parameters**:
- `data: any` - Data to validate
- `rules: ValidationRule[]` - Array of validation rules to apply

**Returns**: `Promise<ValidationResult>` - Validation results

#### Data Types

```typescript
interface ValidationRule {
  name: string
  type: 'critical' | 'warning'
  validator: (data: any) => boolean | Promise<boolean>
  message: string
  enabled: boolean
  contentTypes: string[]
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  canProceed: boolean
  executionTime: number
}

interface ValidationError {
  rule: string
  message: string
  field?: string
  value?: any
}
```

### CalculationService

**Location**: `backend/src/services/CalculationService.ts`

Manages automatic field calculations with sync/async separation.

#### Interface

```typescript
interface CalculationService {
  calculateSync(data: any, calculations: SyncCalculation[]): Promise<CalculationResult>
  scheduleAsync(data: any, calculations: AsyncCalculation[]): Promise<string>
  getCalculationStatus(jobId: string): Promise<CalculationStatus>
  cancelCalculation(jobId: string): Promise<boolean>
}
```

#### Methods

##### `calculateSync(data: any, calculations: SyncCalculation[]): Promise<CalculationResult>`
Executes synchronous calculations immediately.

**Parameters**:
- `data: any` - Input data for calculations
- `calculations: SyncCalculation[]` - Array of calculations to perform

**Returns**: `Promise<CalculationResult>` - Calculation results
**Throws**: `CalculationError` - If calculations fail

##### `scheduleAsync(data: any, calculations: AsyncCalculation[]): Promise<string>`
Schedules asynchronous calculations for background processing.

**Parameters**:
- `data: any` - Input data for calculations
- `calculations: AsyncCalculation[]` - Array of calculations to schedule

**Returns**: `Promise<string>` - Job ID for tracking
**Throws**: `SchedulingError` - If scheduling fails

#### Data Types

```typescript
interface SyncCalculation {
  field: string
  calculator: (data: any) => any
  dependencies: string[]
  timeout: number
}

interface AsyncCalculation {
  name: string
  calculator: (data: any) => Promise<any>
  priority: 'high' | 'medium' | 'low'
  retryAttempts: number
}

interface CalculationResult {
  success: boolean
  results: Record<string, any>
  errors: CalculationError[]
  executionTime: number
}

interface CalculationStatus {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  result?: any
  error?: string
}
```

## Content-Type Specific Service APIs

### TeamHookService

**Location**: `backend/src/services/TeamHookService.ts`

Handles team-specific lifecycle operations.

#### Interface

```typescript
interface TeamHookService extends BaseHookService {
  validateTeamUniqueness(teamData: TeamData): Promise<ValidationResult>
  calculateTeamStatistics(teamData: TeamData): Promise<TeamStatistics>
  updateTeamRankings(teamId: string): Promise<void>
}
```

#### Methods

##### `validateTeamUniqueness(teamData: TeamData): Promise<ValidationResult>`
Validates that team name is unique within the league and season.

**Parameters**:
- `teamData: TeamData` - Team data to validate

**Returns**: `Promise<ValidationResult>` - Validation result
**Throws**: `ValidationError` - If validation fails

##### `calculateTeamStatistics(teamData: TeamData): Promise<TeamStatistics>`
Calculates team statistics including form, performance metrics.

**Parameters**:
- `teamData: TeamData` - Team data for calculations

**Returns**: `Promise<TeamStatistics>` - Calculated statistics
**Throws**: `CalculationError` - If calculation fails

#### Data Types

```typescript
interface TeamData {
  id?: string
  name: string
  liga: string
  saison: string
  founded?: Date
  stadium?: string
}

interface TeamStatistics {
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
  form: string[]
}
```

### SaisonHookService

**Location**: `backend/src/services/SaisonHookService.ts`

Manages season-specific lifecycle operations.

#### Interface

```typescript
interface SaisonHookService extends BaseHookService {
  validateSeasonOverlap(seasonData: SeasonData): Promise<ValidationResult>
  activateSeason(seasonId: string): Promise<void>
  deactivateSeason(seasonId: string): Promise<void>
  getActiveSeason(): Promise<SeasonData | null>
}
```

#### Methods

##### `validateSeasonOverlap(seasonData: SeasonData): Promise<ValidationResult>`
Validates that season dates don't overlap with existing seasons.

**Parameters**:
- `seasonData: SeasonData` - Season data to validate

**Returns**: `Promise<ValidationResult>` - Validation result
**Throws**: `ValidationError` - If validation fails

##### `activateSeason(seasonId: string): Promise<void>`
Activates a season and deactivates others.

**Parameters**:
- `seasonId: string` - ID of season to activate

**Returns**: `Promise<void>`
**Throws**: `ActivationError` - If activation fails

#### Data Types

```typescript
interface SeasonData {
  id?: string
  name: string
  startDate: Date
  endDate: Date
  active: boolean
  liga: string
}
```

### TableHookService

**Location**: `backend/src/services/TableHookService.ts`

Handles table entry lifecycle operations.

#### Interface

```typescript
interface TableHookService extends BaseHookService {
  calculateTablePosition(entryData: TableEntryData): Promise<number>
  updateLeagueTable(ligaId: string): Promise<void>
  validateTableData(entryData: TableEntryData): Promise<ValidationResult>
}
```

#### Methods

##### `calculateTablePosition(entryData: TableEntryData): Promise<number>`
Calculates the position of a team in the league table.

**Parameters**:
- `entryData: TableEntryData` - Table entry data

**Returns**: `Promise<number>` - Calculated position
**Throws**: `CalculationError` - If calculation fails

##### `updateLeagueTable(ligaId: string): Promise<void>`
Updates the entire league table positions and statistics.

**Parameters**:
- `ligaId: string` - ID of the league to update

**Returns**: `Promise<void>`
**Throws**: `UpdateError` - If update fails

#### Data Types

```typescript
interface TableEntryData {
  id?: string
  team: string
  liga: string
  saison: string
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
  position?: number
}
```

## Background Job System APIs

### JobManagementService

**Location**: `backend/src/services/JobManagementService.ts`

Manages background job processing.

#### Interface

```typescript
interface JobManagementService {
  scheduleJob(job: JobDefinition): Promise<string>
  getJobStatus(jobId: string): Promise<JobStatus>
  cancelJob(jobId: string): Promise<boolean>
  getQueueStatus(): Promise<QueueStatus>
  retryJob(jobId: string): Promise<boolean>
}
```

#### Methods

##### `scheduleJob(job: JobDefinition): Promise<string>`
Schedules a new background job.

**Parameters**:
- `job: JobDefinition` - Job definition

**Returns**: `Promise<string>` - Job ID
**Throws**: `SchedulingError` - If scheduling fails

##### `getJobStatus(jobId: string): Promise<JobStatus>`
Gets the current status of a job.

**Parameters**:
- `jobId: string` - Job ID to check

**Returns**: `Promise<JobStatus>` - Current job status
**Throws**: `JobNotFoundError` - If job doesn't exist

#### Data Types

```typescript
interface JobDefinition {
  name: string
  type: 'calculation' | 'maintenance' | 'notification'
  priority: 'high' | 'medium' | 'low'
  data: any
  retryAttempts: number
  timeout: number
}

interface JobStatus {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  startTime?: Date
  endTime?: Date
  result?: any
  error?: string
}

interface QueueStatus {
  pending: number
  running: number
  completed: number
  failed: number
  totalProcessed: number
}
```

## Configuration System APIs

### ConfigurationManager

**Location**: `backend/src/services/config/ConfigurationLoader.ts`

Manages hook configuration loading and caching.

#### Interface

```typescript
interface ConfigurationManager {
  loadConfiguration(environment?: string): Promise<HookConfiguration>
  updateConfiguration(config: Partial<HookConfiguration>): Promise<void>
  getConfigurationVersion(): Promise<string>
  validateConfiguration(config: HookConfiguration): Promise<ValidationResult>
}
```

#### Methods

##### `loadConfiguration(environment?: string): Promise<HookConfiguration>`
Loads configuration for the specified environment.

**Parameters**:
- `environment?: string` - Environment name (defaults to current)

**Returns**: `Promise<HookConfiguration>` - Loaded configuration
**Throws**: `ConfigurationError` - If loading fails

##### `updateConfiguration(config: Partial<HookConfiguration>): Promise<void>`
Updates the current configuration.

**Parameters**:
- `config: Partial<HookConfiguration>` - Configuration updates

**Returns**: `Promise<void>`
**Throws**: `ConfigurationError` - If update fails

#### Data Types

```typescript
interface HookConfiguration {
  version: string
  environment: string
  hooks: {
    [contentType: string]: ContentTypeHookConfig
  }
  validation: ValidationConfig
  calculation: CalculationConfig
  monitoring: MonitoringConfig
}

interface ContentTypeHookConfig {
  enabled: boolean
  timeout: number
  retryAttempts: number
  validations: string[]
  calculations: string[]
}
```

### FeatureFlagService

**Location**: `backend/src/services/feature-flags/FeatureFlagService.ts`

Manages feature flag evaluation and storage.

#### Interface

```typescript
interface FeatureFlagService {
  isEnabled(flagName: string, context?: FlagContext): Promise<boolean>
  setFlag(flagName: string, enabled: boolean): Promise<void>
  getFlag(flagName: string): Promise<FeatureFlag | null>
  listFlags(): Promise<FeatureFlag[]>
}
```

#### Methods

##### `isEnabled(flagName: string, context?: FlagContext): Promise<boolean>`
Checks if a feature flag is enabled.

**Parameters**:
- `flagName: string` - Name of the feature flag
- `context?: FlagContext` - Optional context for evaluation

**Returns**: `Promise<boolean>` - Whether flag is enabled
**Throws**: `FeatureFlagError` - If evaluation fails

##### `setFlag(flagName: string, enabled: boolean): Promise<void>`
Sets the state of a feature flag.

**Parameters**:
- `flagName: string` - Name of the feature flag
- `enabled: boolean` - New state

**Returns**: `Promise<void>`
**Throws**: `FeatureFlagError` - If update fails

#### Data Types

```typescript
interface FeatureFlag {
  name: string
  enabled: boolean
  description: string
  createdAt: Date
  updatedAt: Date
  rules?: FlagRule[]
}

interface FlagContext {
  userId?: string
  environment: string
  contentType?: string
}

interface FlagRule {
  condition: string
  value: boolean
}
```

## Monitoring and Logging APIs

### PerformanceMonitor

**Location**: `backend/src/services/logging/PerformanceMonitor.ts`

Monitors hook performance and collects metrics.

#### Interface

```typescript
interface PerformanceMonitor {
  startTimer(operation: string): Timer
  recordExecution(operation: string, duration: number): void
  getMetrics(operation?: string): Promise<PerformanceMetrics>
  getAverageExecutionTime(operation: string): Promise<number>
}
```

#### Methods

##### `startTimer(operation: string): Timer`
Starts a performance timer for an operation.

**Parameters**:
- `operation: string` - Name of the operation

**Returns**: `Timer` - Timer instance
**Throws**: None

##### `recordExecution(operation: string, duration: number): void`
Records the execution time of an operation.

**Parameters**:
- `operation: string` - Name of the operation
- `duration: number` - Execution time in milliseconds

**Returns**: `void`
**Throws**: None

#### Data Types

```typescript
interface Timer {
  stop(): number
  elapsed(): number
}

interface PerformanceMetrics {
  operation: string
  totalExecutions: number
  averageTime: number
  minTime: number
  maxTime: number
  lastExecution: Date
}
```

### ErrorTracker

**Location**: `backend/src/services/logging/ErrorTracker.ts`

Tracks and categorizes errors in the hook system.

#### Interface

```typescript
interface ErrorTracker {
  trackError(error: Error, context: ErrorContext): Promise<string>
  getErrorStats(timeRange?: TimeRange): Promise<ErrorStats>
  getErrorDetails(errorId: string): Promise<ErrorDetails>
}
```

#### Methods

##### `trackError(error: Error, context: ErrorContext): Promise<string>`
Tracks an error with context information.

**Parameters**:
- `error: Error` - The error that occurred
- `context: ErrorContext` - Context information

**Returns**: `Promise<string>` - Error tracking ID
**Throws**: `TrackingError` - If tracking fails

#### Data Types

```typescript
interface ErrorContext {
  operation: string
  contentType: string
  userId?: string
  requestId: string
  additionalData?: any
}

interface ErrorStats {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsByOperation: Record<string, number>
  timeRange: TimeRange
}

interface ErrorDetails {
  id: string
  error: string
  stackTrace: string
  context: ErrorContext
  timestamp: Date
  resolved: boolean
}
```

## Error Handling

All APIs use consistent error handling patterns:

### Error Types

```typescript
class ServiceError extends Error {
  code: string
  details?: any
}

class ValidationError extends ServiceError {}
class CalculationError extends ServiceError {}
class ConfigurationError extends ServiceError {}
class FeatureFlagError extends ServiceError {}
```

### Error Codes

- `VALIDATION_FAILED` - Validation operation failed
- `CALCULATION_ERROR` - Calculation operation failed
- `TIMEOUT_EXCEEDED` - Operation timed out
- `CONFIGURATION_INVALID` - Configuration is invalid
- `SERVICE_UNAVAILABLE` - Service is temporarily unavailable
- `PERMISSION_DENIED` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Requested resource not found

### Response Format

All API responses follow a consistent format:

```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    executionTime: number
    requestId: string
    timestamp: Date
  }
}
```

This API documentation provides a comprehensive reference for all services in the refactored lifecycle hooks system, enabling effective integration, testing, and maintenance.