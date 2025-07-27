/**
 * Job Scheduler System
 * 
 * Implements job scheduling with priorities, recurring jobs, and dependency management.
 * Supports Requirements 5.4 (async processing) and 3.3 (background jobs).
 */

import { BackgroundJob, BackgroundJobQueue, JobPriority } from './BackgroundJobQueue';
import { AsyncCalculation, CalculationContext } from './CalculationService';

/**
 * Schedule types
 */
type ScheduleType = 'once' | 'recurring' | 'cron' | 'interval';

/**
 * Recurring schedule configuration
 */
interface RecurringSchedule {
  type: 'interval' | 'cron';
  interval?: number; // milliseconds for interval type
  cronExpression?: string; // cron expression for cron type
  maxRuns?: number; // maximum number of runs (undefined = infinite)
  endDate?: Date; // end date for recurring jobs
}

/**
 * Scheduled job interface
 */
interface ScheduledJob {
  id: string;
  name: string;
  type: 'calculation' | 'maintenance' | 'notification';
  priority: JobPriority;
  scheduleType: ScheduleType;
  scheduledAt: Date;
  recurring?: RecurringSchedule;
  dependencies?: string[]; // Job IDs this job depends on
  data: any;
  context?: CalculationContext;
  calculation?: AsyncCalculation;
  enabled: boolean;
  runCount: number;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Dependency resolution result
 */
interface DependencyResolution {
  canRun: boolean;
  waitingFor: string[];
  failedDependencies: string[];
}

/**
 * Schedule validation result
 */
interface ScheduleValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Job Scheduler Class
 */
export class JobScheduler {
  private strapi: any;
  private jobQueue: BackgroundJobQueue;
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private schedulerInterval?: NodeJS.Timeout;
  private dependencyGraph: Map<string, Set<string>> = new Map(); // jobId -> dependencies
  private isRunning: boolean = false;
  private checkInterval: number = 1000; // Check every second

  constructor(strapi: any, jobQueue: BackgroundJobQueue) {
    this.strapi = strapi;
    this.jobQueue = jobQueue;
    
    this.logInfo('JobScheduler initialized');
  }

  /**
   * Start the job scheduler
   */
  start(): void {
    if (this.isRunning) {
      this.logWarn('Job scheduler is already running');
      return;
    }

    this.isRunning = true;
    
    // Start scheduler interval
    this.schedulerInterval = setInterval(() => {
      this.processScheduledJobs();
    }, this.checkInterval);
    
    this.logInfo('Job scheduler started', {
      scheduledJobs: this.scheduledJobs.size,
      checkInterval: this.checkInterval
    });
  }

  /**
   * Stop the job scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = undefined;
    }
    
    this.logInfo('Job scheduler stopped');
  }

  /**
   * Schedule a one-time job
   */
  scheduleOnce(
    name: string,
    scheduledAt: Date,
    jobData: {
      type: 'calculation' | 'maintenance' | 'notification';
      priority: JobPriority;
      data: any;
      context?: CalculationContext;
      calculation?: AsyncCalculation;
      dependencies?: string[];
    }
  ): string {
    const jobId = this.generateScheduledJobId(name);
    
    const scheduledJob: ScheduledJob = {
      id: jobId,
      name,
      type: jobData.type,
      priority: jobData.priority,
      scheduleType: 'once',
      scheduledAt,
      dependencies: jobData.dependencies,
      data: jobData.data,
      context: jobData.context,
      calculation: jobData.calculation,
      enabled: true,
      runCount: 0,
      nextRun: scheduledAt,
      createdAt: new Date()
    };

    return this.addScheduledJob(scheduledJob);
  }

  /**
   * Schedule a recurring job with interval
   */
  scheduleRecurring(
    name: string,
    startAt: Date,
    intervalMs: number,
    jobData: {
      type: 'calculation' | 'maintenance' | 'notification';
      priority: JobPriority;
      data: any;
      context?: CalculationContext;
      calculation?: AsyncCalculation;
      dependencies?: string[];
      maxRuns?: number;
      endDate?: Date;
    }
  ): string {
    const jobId = this.generateScheduledJobId(name);
    
    const scheduledJob: ScheduledJob = {
      id: jobId,
      name,
      type: jobData.type,
      priority: jobData.priority,
      scheduleType: 'recurring',
      scheduledAt: startAt,
      recurring: {
        type: 'interval',
        interval: intervalMs,
        maxRuns: jobData.maxRuns,
        endDate: jobData.endDate
      },
      dependencies: jobData.dependencies,
      data: jobData.data,
      context: jobData.context,
      calculation: jobData.calculation,
      enabled: true,
      runCount: 0,
      nextRun: startAt,
      createdAt: new Date()
    };

    return this.addScheduledJob(scheduledJob);
  }

  /**
   * Schedule a job with cron expression
   */
  scheduleCron(
    name: string,
    cronExpression: string,
    jobData: {
      type: 'calculation' | 'maintenance' | 'notification';
      priority: JobPriority;
      data: any;
      context?: CalculationContext;
      calculation?: AsyncCalculation;
      dependencies?: string[];
      maxRuns?: number;
      endDate?: Date;
    }
  ): string {
    // Validate cron expression
    const validation = this.validateCronExpression(cronExpression);
    if (!validation.isValid) {
      throw new Error(`Invalid cron expression: ${validation.errors.join(', ')}`);
    }

    const jobId = this.generateScheduledJobId(name);
    const nextRun = this.calculateNextCronRun(cronExpression);
    
    const scheduledJob: ScheduledJob = {
      id: jobId,
      name,
      type: jobData.type,
      priority: jobData.priority,
      scheduleType: 'cron',
      scheduledAt: nextRun,
      recurring: {
        type: 'cron',
        cronExpression,
        maxRuns: jobData.maxRuns,
        endDate: jobData.endDate
      },
      dependencies: jobData.dependencies,
      data: jobData.data,
      context: jobData.context,
      calculation: jobData.calculation,
      enabled: true,
      runCount: 0,
      nextRun,
      createdAt: new Date()
    };

    return this.addScheduledJob(scheduledJob);
  }

  /**
   * Cancel a scheduled job
   */
  cancelScheduledJob(jobId: string): boolean {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      return false;
    }

    this.scheduledJobs.delete(jobId);
    this.dependencyGraph.delete(jobId);
    
    // Remove this job from other jobs' dependencies
    for (const [otherId, deps] of this.dependencyGraph.entries()) {
      deps.delete(jobId);
    }

    this.logInfo(`Scheduled job cancelled: ${job.name}`, { jobId });
    return true;
  }

  /**
   * Enable/disable a scheduled job
   */
  setJobEnabled(jobId: string, enabled: boolean): boolean {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      return false;
    }

    job.enabled = enabled;
    
    this.logInfo(`Scheduled job ${enabled ? 'enabled' : 'disabled'}: ${job.name}`, { jobId });
    return true;
  }

  /**
   * Get scheduled job by ID
   */
  getScheduledJob(jobId: string): ScheduledJob | null {
    return this.scheduledJobs.get(jobId) || null;
  }

  /**
   * Get all scheduled jobs with optional filtering
   */
  getScheduledJobs(filter?: {
    enabled?: boolean;
    type?: string;
    priority?: JobPriority;
    scheduleType?: ScheduleType;
  }): ScheduledJob[] {
    let jobs = Array.from(this.scheduledJobs.values());

    if (filter) {
      if (filter.enabled !== undefined) {
        jobs = jobs.filter(job => job.enabled === filter.enabled);
      }
      if (filter.type) {
        jobs = jobs.filter(job => job.type === filter.type);
      }
      if (filter.priority) {
        jobs = jobs.filter(job => job.priority === filter.priority);
      }
      if (filter.scheduleType) {
        jobs = jobs.filter(job => job.scheduleType === filter.scheduleType);
      }
    }

    return jobs.sort((a, b) => {
      if (a.nextRun && b.nextRun) {
        return a.nextRun.getTime() - b.nextRun.getTime();
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Get jobs ready to run
   */
  getJobsReadyToRun(): ScheduledJob[] {
    const now = new Date();
    const readyJobs: ScheduledJob[] = [];

    for (const job of this.scheduledJobs.values()) {
      if (!job.enabled || !job.nextRun || job.nextRun > now) {
        continue;
      }

      // Check if recurring job has reached limits
      if (job.recurring) {
        if (job.recurring.maxRuns && job.runCount >= job.recurring.maxRuns) {
          continue;
        }
        if (job.recurring.endDate && now > job.recurring.endDate) {
          continue;
        }
      }

      // Check dependencies
      const depResolution = this.resolveDependencies(job);
      if (depResolution.canRun) {
        readyJobs.push(job);
      }
    }

    return readyJobs.sort((a, b) => {
      // Sort by priority, then by scheduled time
      const priorityWeights = { high: 1, medium: 2, low: 3 };
      const aPriority = priorityWeights[a.priority];
      const bPriority = priorityWeights[b.priority];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return (a.nextRun?.getTime() || 0) - (b.nextRun?.getTime() || 0);
    });
  }

  /**
   * Add a scheduled job
   */
  private addScheduledJob(job: ScheduledJob): string {
    // Validate schedule
    const validation = this.validateSchedule(job);
    if (!validation.isValid) {
      throw new Error(`Invalid schedule: ${validation.errors.join(', ')}`);
    }

    // Store job
    this.scheduledJobs.set(job.id, job);
    
    // Update dependency graph
    if (job.dependencies && job.dependencies.length > 0) {
      this.dependencyGraph.set(job.id, new Set(job.dependencies));
    }

    this.logInfo(`Scheduled job added: ${job.name}`, {
      jobId: job.id,
      scheduleType: job.scheduleType,
      nextRun: job.nextRun
    });

    return job.id;
  }

  /**
   * Process scheduled jobs
   */
  private async processScheduledJobs(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const readyJobs = this.getJobsReadyToRun();
    
    for (const scheduledJob of readyJobs) {
      try {
        await this.executeScheduledJob(scheduledJob);
      } catch (error) {
        this.logError(`Failed to execute scheduled job: ${scheduledJob.name}`, {
          jobId: scheduledJob.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Execute a scheduled job
   */
  private async executeScheduledJob(scheduledJob: ScheduledJob): Promise<void> {
    // Create background job
    const backgroundJob: BackgroundJob = {
      id: this.generateBackgroundJobId(scheduledJob),
      name: scheduledJob.name,
      type: scheduledJob.type,
      priority: scheduledJob.priority,
      status: 'pending',
      data: scheduledJob.data,
      context: scheduledJob.context,
      calculation: scheduledJob.calculation,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 2,
      timeout: 30000
    };

    // Add to job queue
    const jobId = this.jobQueue.addJob(backgroundJob);
    
    // Update scheduled job
    scheduledJob.runCount++;
    scheduledJob.lastRun = new Date();
    
    // Calculate next run for recurring jobs
    if (scheduledJob.scheduleType === 'recurring' && scheduledJob.recurring) {
      scheduledJob.nextRun = this.calculateNextRun(scheduledJob);
    } else {
      // One-time job, remove from schedule
      scheduledJob.nextRun = undefined;
      if (scheduledJob.scheduleType === 'once') {
        this.scheduledJobs.delete(scheduledJob.id);
        this.dependencyGraph.delete(scheduledJob.id);
      }
    }

    this.logInfo(`Scheduled job executed: ${scheduledJob.name}`, {
      scheduledJobId: scheduledJob.id,
      backgroundJobId: jobId,
      runCount: scheduledJob.runCount,
      nextRun: scheduledJob.nextRun
    });
  }

  /**
   * Resolve job dependencies
   */
  private resolveDependencies(job: ScheduledJob): DependencyResolution {
    if (!job.dependencies || job.dependencies.length === 0) {
      return { canRun: true, waitingFor: [], failedDependencies: [] };
    }

    const waitingFor: string[] = [];
    const failedDependencies: string[] = [];

    for (const depId of job.dependencies) {
      // Check if dependency is a scheduled job
      const depScheduledJob = this.scheduledJobs.get(depId);
      if (depScheduledJob) {
        if (depScheduledJob.runCount === 0) {
          waitingFor.push(depId);
          continue;
        }
      }

      // Check if dependency is a background job
      const depJobStatus = this.jobQueue.getJobStatus(depId);
      if (depJobStatus) {
        if (depJobStatus.status === 'pending' || depJobStatus.status === 'running') {
          waitingFor.push(depId);
        } else if (depJobStatus.status === 'failed') {
          failedDependencies.push(depId);
        }
      } else {
        // Dependency not found, consider it failed
        failedDependencies.push(depId);
      }
    }

    return {
      canRun: waitingFor.length === 0 && failedDependencies.length === 0,
      waitingFor,
      failedDependencies
    };
  }

  /**
   * Calculate next run time for recurring jobs
   */
  private calculateNextRun(job: ScheduledJob): Date | undefined {
    if (!job.recurring) {
      return undefined;
    }

    const now = new Date();

    if (job.recurring.type === 'interval' && job.recurring.interval) {
      return new Date(now.getTime() + job.recurring.interval);
    }

    if (job.recurring.type === 'cron' && job.recurring.cronExpression) {
      return this.calculateNextCronRun(job.recurring.cronExpression, now);
    }

    return undefined;
  }

  /**
   * Calculate next cron run time
   */
  private calculateNextCronRun(cronExpression: string, from: Date = new Date()): Date {
    // Simple cron parser for basic expressions
    // Format: minute hour day month dayOfWeek
    const parts = cronExpression.trim().split(/\s+/);
    
    if (parts.length !== 5) {
      throw new Error('Cron expression must have 5 parts');
    }

    const [minute, hour, day, month, dayOfWeek] = parts;
    
    // For now, implement basic support for specific times
    // Full cron parsing would require a dedicated library
    
    const next = new Date(from);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Parse minute
    if (minute !== '*') {
      const min = parseInt(minute);
      if (isNaN(min) || min < 0 || min > 59) {
        throw new Error('Invalid minute in cron expression');
      }
      next.setMinutes(min);
    }

    // Parse hour
    if (hour !== '*') {
      const hr = parseInt(hour);
      if (isNaN(hr) || hr < 0 || hr > 23) {
        throw new Error('Invalid hour in cron expression');
      }
      next.setHours(hr);
    }

    // If the calculated time is in the past, add a day
    if (next <= from) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Validate cron expression
   */
  private validateCronExpression(cronExpression: string): ScheduleValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const parts = cronExpression.trim().split(/\s+/);
      
      if (parts.length !== 5) {
        errors.push('Cron expression must have exactly 5 parts (minute hour day month dayOfWeek)');
        return { isValid: false, errors, warnings };
      }

      const [minute, hour, day, month, dayOfWeek] = parts;

      // Validate minute
      if (minute !== '*') {
        const min = parseInt(minute);
        if (isNaN(min) || min < 0 || min > 59) {
          errors.push('Minute must be between 0 and 59 or *');
        }
      }

      // Validate hour
      if (hour !== '*') {
        const hr = parseInt(hour);
        if (isNaN(hr) || hr < 0 || hr > 23) {
          errors.push('Hour must be between 0 and 23 or *');
        }
      }

      // For now, only support * for day, month, dayOfWeek
      if (day !== '*') {
        warnings.push('Day field only supports * in this implementation');
      }
      if (month !== '*') {
        warnings.push('Month field only supports * in this implementation');
      }
      if (dayOfWeek !== '*') {
        warnings.push('Day of week field only supports * in this implementation');
      }

    } catch (error) {
      errors.push(`Invalid cron expression: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate schedule configuration
   */
  private validateSchedule(job: ScheduledJob): ScheduleValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate scheduled time
    if (job.scheduleType === 'once' && job.scheduledAt < new Date()) {
      warnings.push('Scheduled time is in the past');
    }

    // Validate recurring configuration
    if (job.scheduleType === 'recurring' && job.recurring) {
      if (job.recurring.type === 'interval') {
        if (!job.recurring.interval || job.recurring.interval < 1000) {
          errors.push('Interval must be at least 1000ms (1 second)');
        }
      }

      if (job.recurring.type === 'cron') {
        if (!job.recurring.cronExpression) {
          errors.push('Cron expression is required for cron type');
        } else {
          const cronValidation = this.validateCronExpression(job.recurring.cronExpression);
          errors.push(...cronValidation.errors);
          warnings.push(...cronValidation.warnings);
        }
      }

      if (job.recurring.maxRuns && job.recurring.maxRuns < 1) {
        errors.push('Max runs must be at least 1');
      }

      if (job.recurring.endDate && job.recurring.endDate < new Date()) {
        warnings.push('End date is in the past');
      }
    }

    // Validate dependencies
    if (job.dependencies) {
      for (const depId of job.dependencies) {
        if (depId === job.id) {
          errors.push('Job cannot depend on itself');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate unique scheduled job ID
   */
  private generateScheduledJobId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `scheduled-${name}-${timestamp}-${random}`;
  }

  /**
   * Generate background job ID from scheduled job
   */
  private generateBackgroundJobId(scheduledJob: ScheduledJob): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${scheduledJob.name}-run${scheduledJob.runCount + 1}-${timestamp}-${random}`;
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[JobScheduler] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[JobScheduler] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[JobScheduler] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[JobScheduler] ${message}`, error);
  }
}

export default JobScheduler;
export type {
  ScheduledJob,
  RecurringSchedule,
  DependencyResolution,
  ScheduleValidation,
  ScheduleType
};