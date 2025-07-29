/**
 * Admin Extensions Index for Tabellen-Automatisierung
 * Export point for admin panel extensions and types
 */

// Export all admin extension types
export * from './types';

// Re-export relevant types from services
export type {
  QueueStatus,
  JobStatus,
  Priority,
  CalculationTrigger,
  SnapshotId,
  JobId
} from '../../../api/tabellen-eintrag/services/types';

// Admin component interfaces (to be implemented in later tasks)
export interface AdminComponent {
  render(): any;
  initialize(): Promise<void>;
  destroy(): void;
}

export interface RecalculateButton extends AdminComponent {
  onRecalculate(ligaId: number): Promise<void>;
  setLoading(loading: boolean): void;
  showResult(result: any): void;
}

export interface QueueMonitor extends AdminComponent {
  updateStatus(status: QueueStatus): void;
  showJobs(jobs: any[]): void;
  onPause(): Promise<void>;
  onResume(): Promise<void>;
}

export interface SnapshotManager extends AdminComponent {
  listSnapshots(): Promise<void>;
  onRestore(snapshotId: string): Promise<void>;
  onDelete(snapshotId: string): Promise<void>;
  showRestoreConfirmation(snapshot: any): Promise<boolean>;
}

// Admin route definitions
export const ADMIN_ROUTES = {
  RECALCULATE: '/api/admin/tabellen/recalculate',
  QUEUE_STATUS: '/api/admin/tabellen/queue-status',
  PAUSE_AUTOMATION: '/api/admin/tabellen/pause',
  RESUME_AUTOMATION: '/api/admin/tabellen/resume',
  SNAPSHOTS: '/api/admin/tabellen/snapshots',
  ROLLBACK: '/api/admin/tabellen/rollback',
  HEALTH: '/api/admin/tabellen/health',
  HISTORY: '/api/admin/tabellen/history'
} as const;

// Admin permissions
export const ADMIN_PERMISSIONS = {
  VIEW_QUEUE: 'tabellen.queue.view',
  MANAGE_QUEUE: 'tabellen.queue.manage',
  TRIGGER_CALCULATION: 'tabellen.calculation.trigger',
  VIEW_SNAPSHOTS: 'tabellen.snapshots.view',
  MANAGE_SNAPSHOTS: 'tabellen.snapshots.manage',
  ROLLBACK: 'tabellen.rollback',
  VIEW_HEALTH: 'tabellen.health.view',
  MANAGE_SETTINGS: 'tabellen.settings.manage'
} as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];

// Admin middleware interfaces
export interface AdminMiddleware {
  checkPermission(permission: AdminPermission): (req: any, res: any, next: any) => void;
  validateRequest(schema: any): (req: any, res: any, next: any) => void;
  logAdminAction(action: string): (req: any, res: any, next: any) => void;
}