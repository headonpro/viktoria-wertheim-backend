/**
 * Admin Panel Extension Types for Tabellen-Automatisierung
 * Interfaces for admin UI components and API endpoints
 */

export interface AdminExtension {
  addRecalculateButton(): void;
  addQueueMonitoring(): void;
  addSnapshotManagement(): void;
  showCalculationStatus(): void;
}

export interface AdminAPI {
  triggerRecalculation(ligaId: number, saisonId?: number): Promise<JobId>;
  getQueueStatus(): Promise<QueueStatus>;
  pauseAutomation(): Promise<void>;
  resumeAutomation(): Promise<void>;
  rollbackToSnapshot(snapshotId: SnapshotId): Promise<void>;
  getCalculationHistory(ligaId: number, limit?: number): Promise<CalculationHistoryEntry[]>;
  getSystemHealth(): Promise<SystemHealth>;
}

export interface RecalculationRequest {
  ligaId: number;
  saisonId?: number;
  priority?: Priority;
  description?: string;
}

export interface RecalculationResponse {
  success: boolean;
  jobId: JobId;
  message: string;
  estimatedDuration?: number;
}

export interface QueueStatus {
  isRunning: boolean;
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
  currentJobs: CurrentJob[];
}

export interface CurrentJob {
  id: JobId;
  ligaId: number;
  saisonId: number;
  priority: Priority;
  status: JobStatus;
  progress: number;
  startedAt: Date;
  estimatedCompletion?: Date;
}

export interface CalculationHistoryEntry {
  id: string;
  ligaId: number;
  saisonId: number;
  trigger: CalculationTrigger;
  status: JobStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  entriesUpdated: number;
}

export interface SystemHealth {
  status: SystemStatus;
  components: ComponentHealth[];
  lastChecked: Date;
  uptime: number;
}

export interface ComponentHealth {
  name: string;
  status: ComponentStatus;
  message?: string;
  lastChecked: Date;
  metrics?: ComponentMetrics;
}

export interface ComponentMetrics {
  responseTime?: number;
  errorRate?: number;
  throughput?: number;
  memoryUsage?: number;
}

export enum SystemStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  MAINTENANCE = 'maintenance'
}

export enum ComponentStatus {
  UP = 'up',
  DOWN = 'down',
  WARNING = 'warning',
  UNKNOWN = 'unknown'
}

export interface AutomationSettings {
  enabled: boolean;
  queueConcurrency: number;
  maxRetries: number;
  jobTimeout: number;
  snapshotRetention: number;
  enableNotifications: boolean;
  logLevel: LogLevel;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Re-export common types for consistency
export type JobId = string;
export type SnapshotId = string;

export enum Priority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum CalculationTrigger {
  GAME_RESULT = 'game_result',
  GAME_CREATED = 'game_created',
  GAME_DELETED = 'game_deleted',
  MANUAL_TRIGGER = 'manual_trigger',
  SCHEDULED = 'scheduled'
}