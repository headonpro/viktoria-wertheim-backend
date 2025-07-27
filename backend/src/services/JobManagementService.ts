/**
 * Job Management Service
 * 
 * Integrates job queue, scheduler, and monitoring into a unified service.
 * Provides a single interface for all job-related operations.
 * 
 * Supports Requirements 3.3, 5.4, 7.3, and 7.4.
 */

import { BackgroundJobQueue, QueueConfiguration, BackgroundJob, JobStatus } from './BackgroundJobQueue';
import { JobScheduler, ScheduledJob, ScheduleType } from './JobScheduler';
import { JobMonitor, SystemHealthMetrics, JobAlert, JobPerformanceMetrics } from './JobMonitor';
import { AsyncCalculation, CalculationContext, CalculationStatus } from './CalculationService';

/**
 * Job management configuration
 */
interface JobManagementConfig {
  queue: Partial<QueueConfiguration>;
  monitoring: {
    enabled: boolean;
    healthCheckInterval: number;
    alerting: {
      enabled: boolean;
      channels: string[];
    };
  };
  scheduler: {
    enabled: boolean;
    checkInterval: number;
  };
}

/**
 * Default job management configuration
 */
const DEFAULT_JOB_MANAGEMENT_CONFIG: JobManagementConfig = {
  queue: {
    maxWorkers: 3,
    maxQueueSize: 100,
    defaultTimeout: 30000,
    defaultRetries: 2
  },
  monitoring: {
    enabled: true,
    healthCheckInterval: 30000,
    alerting: {
      enabled: true,
      channels: ['log']
    }
  },
  scheduler: {
    enabled: true,
    checkInterval: 1000
  }
};

/**
 * Job execution summary
 */
interface JobExecutionSummary {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  runningJobs: number;
  averageExecutionTime: number;
  successRate: number;
  recentFailures: number;
}

/**
 * System status overview
 */
interface SystemStatus {
  queue: {
    status: 'healthy' | 'warning' | 'critical';
    length: number;
    activeWorkers: number;
  };
  scheduler: {
    status: 'running' | 'stopped';
    scheduledJobs: number;
    nextJobAt?: Date;
  };
  monitoring: {
    status: 'running' | 'stopped';
    lastHealthCheck?: Date;
    activeAlerts: number;
  };
  overall: 'healthy' | 'warning' | 'critical';
}

/**
 * Job Management Service Class
 */
export class JobManagementService {
  private strapi: any;
  private config: JobManagementConfig;
  
  // Core components
  private jobQueue: BackgroundJobQueue;
  private jobScheduler?: JobScheduler;
  private jobMonitor?: JobMonitor;
  
  // Service state
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  constructor(strapi: any, config: Partial<JobManagementConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_JOB_MANAGEMENT_CONFIG, ...config };
    
    // Initialize core components
    this.jobQueue = new BackgroundJobQueue(strapi, this.config.queue);
    
    if (this.config.scheduler.enabled) {
      this.jobScheduler = new JobScheduler(strapi, this.jobQueue);
    }
    
    if (this.config.monitoring.enabled) {
      this.jobMonitor = new JobMonitor(
        strapi, 
        this.jobQueue, 
        this.jobScheduler,
        {
          healthCheckInterval: this.config.monitoring.healthCheckInterval,
          alerting: this.config.monitoring.alerting
        }
      );
    }
    
    this.isInitialized = true;
    this.logInfo('JobManagementService initialized', {
      schedulerEnabled: !!this.jobScheduler,
      monitoringEnabled: !!this.jobMonitor
    });
  }

  /**
   * Start all job management services
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('JobManagementService not initialized');
    }
    
    if (this.isRunning) {
      this.logWarn('Job management service is already running');
      return;
    }

    try {
      // Start job queue
      this.jobQueue.start();
      
      // Start scheduler if enabled
      if (this.jobScheduler) {
        this.jobScheduler.start();
      }
      
      // Start monitoring if enabled
      if (this.jobMonitor) {
        this.jobMonitor.start();
      }
      
      this.isRunning = true;
      
      this.logInfo('Job management service started', {
        queueRunning: true,
        schedulerRunning: !!this.jobScheduler,
        monitoringRunning: !!this.jobMonitor
      });
      
    } catch (error) {
      this.logError('Failed to start job management service', error);
      throw error;
    }
  }

  /**
   * Stop all job management services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Stop monitoring first
      if (this.jobMonitor) {
        this.jobMonitor.stop();
      }
      
      // Stop scheduler
      if (this.jobScheduler) {
        this.jobScheduler.stop();
      }
      
      // Stop job queue last (wait for jobs to complete)
      await this.jobQueue.stop();
      
      this.isRunning = false;
      
      this.logInfo('Job management service stopped');
      
    } catch (error) {
      this.logError('Error stopping job management service', error);
      throw error;
    }
  }

  /**
   * Add a calculation job to the queue
   */
  addCalculationJob(
    calculation: AsyncCalculation,
    data: any,
    context: CalculationContext
  ): string {
    if (!this.isRunning) {
      throw new Error('Job management service is not running');
    }
    
    const jobId = this.jobQueue.addCalculationJob(calculation, data, context);
    
    this.logDebug(`Calculation job added: ${calculation.name}`, {
      jobId,
      priority: calculation.priority
    });
    
    return jobId;
  }

  /**
   * Schedule a one-time calculation job
   */
  scheduleCalculationJob(
    calculation: AsyncCalculation,
    data: any,
    context: CalculationContext,
    scheduledAt: Date
  ): string {
    if (!this.jobScheduler) {
      throw new Error('Job scheduler is not enabled');
    }
    
    const jobId = this.jobScheduler.scheduleOnce(
      calculation.name,
      scheduledAt,
      {
        type: 'calculation',
        priority: calculation.priority,
        data,
        context,
        calculation
      }
    );
    
    this.logDebug(`Calculation job scheduled: ${calculation.name}`, {
      jobId,
      scheduledAt
    });
    
    return jobId;
  }

  /**
   * Schedule a recurring calculation job
   */
  scheduleRecurringCalculationJob(
    calculation: AsyncCalculation,
    data: any,
    context: CalculationContext,
    startAt: Date,
    intervalMs: number,
    options?: {
      maxRuns?: number;
      endDate?: Date;
    }
  ): string {
    if (!this.jobScheduler) {
      throw new Error('Job scheduler is not enabled');
    }
    
    const jobId = this.jobScheduler.scheduleRecurring(
      calculation.name,
      startAt,
      intervalMs,
      {
        type: 'calculation',
        priority: calculation.priority,
        data,
        context,
        calculation,
        maxRuns: options?.maxRuns,
        endDate: options?.endDate
      }
    );
    
    this.logDebug(`Recurring calculation job scheduled: ${calculation.name}`, {
      jobId,
      startAt,
      intervalMs
    });
    
    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): CalculationStatus | null {
    return this.jobQueue.getJobStatus(jobId);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const result = this.jobQueue.cancelJob(jobId);
    
    if (result) {
      this.logInfo(`Job cancelled: ${jobId}`);
    }
    
    return result;
  }

  /**
   * Cancel a scheduled job
   */
  cancelScheduledJob(jobId: string): boolean {
    if (!this.jobScheduler) {
      return false;
    }
    
    const result = this.jobScheduler.cancelScheduledJob(jobId);
    
    if (result) {
      this.logInfo(`Scheduled job cancelled: ${jobId}`);
    }
    
    return result;
  }

  /**
   * Retry a failed job
   */
  retryJob(jobId: string): boolean {
    const result = this.jobQueue.retryJob(jobId);
    
    if (result) {
      this.logInfo(`Job queued for retry: ${jobId}`);
    }
    
    return result;
  }

  /**
   * Get job execution summary
   */
  getJobExecutionSummary(): JobExecutionSummary {
    const stats = this.jobQueue.getStatistics();
    
    const recentFailures = this.jobMonitor ? 
      this.jobMonitor.getJobMetrics().reduce((total, metrics) => 
        total + metrics.recentFailures.length, 0
      ) : 0;
    
    return {
      totalJobs: stats.totalJobs,
      completedJobs: stats.completedJobs,
      failedJobs: stats.failedJobs,
      pendingJobs: stats.pendingJobs,
      runningJobs: stats.runningJobs,
      averageExecutionTime: stats.averageExecutionTime,
      successRate: stats.totalJobs > 0 ? 
        (stats.completedJobs / stats.totalJobs) * 100 : 0,
      recentFailures
    };
  }

  /**
   * Get system status overview
   */
  getSystemStatus(): SystemStatus {
    const queueStats = this.jobQueue.getStatistics();
    const systemHealth = this.jobMonitor?.getSystemHealth();
    
    // Determine overall status
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (systemHealth) {
      const statuses = [
        systemHealth.queueHealth.status,
        systemHealth.workerHealth.status,
        systemHealth.performanceHealth.status,
        systemHealth.errorHealth.status
      ];
      
      if (statuses.includes('critical')) {
        overallStatus = 'critical';
      } else if (statuses.includes('warning')) {
        overallStatus = 'warning';
      }
    }
    
    // Get next scheduled job
    let nextJobAt: Date | undefined;
    if (this.jobScheduler) {
      const scheduledJobs = this.jobScheduler.getScheduledJobs({ enabled: true });
      if (scheduledJobs.length > 0) {
        nextJobAt = scheduledJobs[0].nextRun;
      }
    }
    
    return {
      queue: {
        status: systemHealth?.queueHealth.status || 'healthy',
        length: queueStats.queueLength,
        activeWorkers: queueStats.activeWorkers
      },
      scheduler: {
        status: this.jobScheduler ? 'running' : 'stopped',
        scheduledJobs: this.jobScheduler ? 
          this.jobScheduler.getScheduledJobs().length : 0,
        nextJobAt
      },
      monitoring: {
        status: this.jobMonitor ? 'running' : 'stopped',
        lastHealthCheck: undefined, // Would need to expose this from monitor
        activeAlerts: this.jobMonitor ? 
          this.jobMonitor.getAlerts({ resolved: false }).length : 0
      },
      overall: overallStatus
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): JobPerformanceMetrics[] {
    if (!this.jobMonitor) {
      return [];
    }
    
    return this.jobMonitor.getJobMetrics();
  }

  /**
   * Get system health metrics
   */
  getSystemHealth(): SystemHealthMetrics | null {
    if (!this.jobMonitor) {
      return null;
    }
    
    return this.jobMonitor.getSystemHealth();
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): JobAlert[] {
    if (!this.jobMonitor) {
      return [];
    }
    
    return this.jobMonitor.getAlerts({ resolved: false });
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    if (!this.jobMonitor) {
      return false;
    }
    
    return this.jobMonitor.acknowledgeAlert(alertId, acknowledgedBy);
  }

  /**
   * Get all jobs with filtering
   */
  getJobs(filter?: {
    status?: JobStatus;
    type?: string;
    limit?: number;
  }): BackgroundJob[] {
    return this.jobQueue.getJobs(filter);
  }

  /**
   * Get scheduled jobs
   */
  getScheduledJobs(filter?: {
    enabled?: boolean;
    type?: string;
    scheduleType?: ScheduleType;
  }): ScheduledJob[] {
    if (!this.jobScheduler) {
      return [];
    }
    
    return this.jobScheduler.getScheduledJobs(filter);
  }

  /**
   * Enable/disable a scheduled job
   */
  setScheduledJobEnabled(jobId: string, enabled: boolean): boolean {
    if (!this.jobScheduler) {
      return false;
    }
    
    return this.jobScheduler.setJobEnabled(jobId, enabled);
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): number {
    const cleared = this.jobQueue.clearCompletedJobs();
    
    this.logInfo(`Cleared ${cleared} completed jobs`);
    return cleared;
  }

  /**
   * Get queue statistics
   */
  getQueueStatistics() {
    return this.jobQueue.getStatistics();
  }

  /**
   * Check if service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[JobManagementService] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[JobManagementService] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[JobManagementService] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[JobManagementService] ${message}`, error);
  }
}

/**
 * Singleton job management service instance
 */
let jobManagementInstance: JobManagementService | null = null;

/**
 * Get or create job management service instance
 */
export function getJobManagementService(
  strapi?: any,
  config?: Partial<JobManagementConfig>
): JobManagementService {
  if (!jobManagementInstance && strapi) {
    jobManagementInstance = new JobManagementService(strapi, config);
  }
  
  if (!jobManagementInstance) {
    throw new Error('JobManagementService not initialized. Call with strapi instance first.');
  }
  
  return jobManagementInstance;
}

/**
 * Initialize job management service with strapi instance
 */
export function initializeJobManagementService(
  strapi: any,
  config?: Partial<JobManagementConfig>
): JobManagementService {
  jobManagementInstance = new JobManagementService(strapi, config);
  return jobManagementInstance;
}

/**
 * Reset job management service instance (mainly for testing)
 */
export function resetJobManagementService(): void {
  if (jobManagementInstance) {
    jobManagementInstance.stop();
  }
  jobManagementInstance = null;
}

export default JobManagementService;
export type {
  JobManagementConfig,
  JobExecutionSummary,
  SystemStatus
};