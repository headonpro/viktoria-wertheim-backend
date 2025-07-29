/**
 * Queue Manager for Table Calculation Jobs
 * Handles job scheduling, processing, and monitoring with comprehensive error handling
 */

import { DEFAULT_AUTOMATION_CONFIG } from '../../../config/automation';
import { StructuredErrorHandler } from './error-handler';
import { ErrorClassifier } from './error-classifier';
import { createDefaultFallbackStrategy } from './fallback-strategy';
import { 
  AutomationError, 
  ErrorContext, 
  AutomationErrorType,
  ErrorSeverity,
  ERROR_CODES,
  BackoffType 
} from './error-handling';
import type { TabellenBerechnungsService } from './tabellen-berechnung';

// Simple UUID generator without external dependency
function generateJobId(): string {
  return 'job_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

export interface QueueManager {
  addCalculationJob(ligaId: number, saisonId: number, priority?: Priority, trigger?: string, description?: string): Promise<JobId>;
  processQueue(): Promise<void>;
  getQueueStatus(): QueueStatus;
  pauseQueue(): void;
  resumeQueue(): void;
  clearQueue(): Promise<void>;
  getJobById(jobId: JobId): Promise<CalculationJob | null>;
  retryFailedJob(jobId: JobId): Promise<void>;
  getDeadLetterJobs(): CalculationJob[];
  reprocessDeadLetterJob(jobId: JobId): Promise<void>;
  clearDeadLetterQueue(): Promise<void>;
  getJobHistory(ligaId: number, limit?: number): Promise<CalculationHistoryEntry[]>;
}

export class QueueManagerImpl implements QueueManager {
  private jobs: Map<JobId, CalculationJob> = new Map();
  private deadLetterJobs: Map<JobId, CalculationJob> = new Map();
  private isProcessing = false;
  private isPaused = false;
  private processingJobs = new Set<JobId>();
  private jobLocks: Map<string, JobId> = new Map(); // Liga+Saison -> JobId mapping for duplicate prevention
  private config: QueueConfiguration;
  private tabellenService: TabellenBerechnungsService;
  private cleanupInterval?: NodeJS.Timeout;
  private retryInterval?: NodeJS.Timeout;
  private errorHandler: StructuredErrorHandler;
  private metrics: JobMetrics = {
    totalProcessed: 0,
    successRate: 0,
    averageProcessingTime: 0,
    errorRate: 0,
    retryRate: 0,
    timeoutRate: 0,
    deadLetterCount: 0
  };

  constructor(
    tabellenService: TabellenBerechnungsService,
    config: QueueConfiguration = DEFAULT_AUTOMATION_CONFIG.queue
  ) {
    this.tabellenService = tabellenService;
    this.config = config;
    
    // Initialize error handler with fallback strategy and retry configuration
    const fallbackStrategy = createDefaultFallbackStrategy();
    const retryStrategy = {
      maxRetries: config.retryConfig?.maxRetries || 3,
      backoffType: (config.retryConfig?.backoffType === 'linear' ? BackoffType.LINEAR : BackoffType.EXPONENTIAL),
      baseDelay: config.retryConfig?.baseDelay || 1000,
      maxDelay: config.retryConfig?.maxDelay || 30000,
      jitter: config.retryConfig?.jitter || true,
      retryableErrors: [
        AutomationErrorType.TIMEOUT_ERROR,
        AutomationErrorType.NETWORK_ERROR,
        AutomationErrorType.CONNECTION_ERROR,
        AutomationErrorType.CONCURRENCY_ERROR,
        AutomationErrorType.QUEUE_ERROR
      ]
    };
    
    this.errorHandler = new StructuredErrorHandler(fallbackStrategy, retryStrategy);
    this.startCleanupInterval();
    this.startRetryInterval();
  }

  async addCalculationJob(
    ligaId: number,
    saisonId: number,
    priority: Priority = Priority.NORMAL,
    trigger: string = 'UNKNOWN',
    description?: string
  ): Promise<JobId> {
    const lockKey = `${ligaId}-${saisonId}`;
    
    // Check if there's already a job for this liga/saison combination
    const existingJobId = this.jobLocks.get(lockKey);
    if (existingJobId) {
      const existingJob = this.jobs.get(existingJobId);
      if (existingJob && (existingJob.status === JobStatus.PENDING || existingJob.status === JobStatus.PROCESSING)) {
        // Return existing job ID if it's still active
        return existingJobId;
      } else {
        // Clean up stale lock
        this.jobLocks.delete(lockKey);
      }
    }

    const jobId = generateJobId();
    const job: CalculationJob = {
      id: jobId,
      ligaId,
      saisonId,
      priority,
      status: JobStatus.PENDING,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      timeoutCount: 0,
      errorHistory: [],
      trigger,
      description
    };

    this.jobs.set(jobId, job);
    this.jobLocks.set(lockKey, jobId);
    
    // Start processing if not already running and queue is enabled
    if (this.config.enabled && !this.isProcessing && !this.isPaused) {
      // Use setTimeout to avoid immediate processing in tests
      setTimeout(() => this.processQueue(), 0);
    }

    return jobId;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.isPaused) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.hasPendingJobs() && !this.isPaused) {
        const availableSlots = this.config.concurrency - this.processingJobs.size;
        if (availableSlots <= 0) {
          await this.waitForSlot();
          continue;
        }

        const jobs = this.getNextJobs(availableSlots);
        const processingPromises = jobs.map(job => this.processJob(job));
        
        // Process jobs concurrently but don't wait for all to complete
        Promise.allSettled(processingPromises);
        
        // Small delay to prevent tight loop
        await this.sleep(100);
      }
    } finally {
      // Only set to false if no jobs are still processing
      if (this.processingJobs.size === 0) {
        this.isProcessing = false;
      }
    }
  }

  getQueueStatus(): QueueStatus {
    const jobs = Array.from(this.jobs.values());
    const pendingJobs = jobs.filter(job => job.status === JobStatus.PENDING).length;
    const processingJobs = jobs.filter(job => job.status === JobStatus.PROCESSING).length;
    const completedJobs = jobs.filter(job => job.status === JobStatus.COMPLETED).length;
    const failedJobs = jobs.filter(job => job.status === JobStatus.FAILED).length;

    const completedJobsWithTime = jobs.filter(
      job => job.status === JobStatus.COMPLETED && job.startedAt && job.completedAt
    );
    
    const averageProcessingTime = completedJobsWithTime.length > 0
      ? completedJobsWithTime.reduce((sum, job) => {
          const processingTime = job.completedAt!.getTime() - job.startedAt!.getTime();
          return sum + processingTime;
        }, 0) / completedJobsWithTime.length
      : 0;

    const lastProcessedJob = jobs
      .filter(job => job.completedAt)
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0];

    return {
      isRunning: this.isProcessing,
      totalJobs: jobs.length,
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime,
      lastProcessedAt: lastProcessedJob?.completedAt
    };
  }

  pauseQueue(): void {
    this.isPaused = true;
  }

  resumeQueue(): void {
    this.isPaused = false;
    if (!this.isProcessing && this.config.enabled) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  async clearQueue(): Promise<void> {
    // Cancel all pending jobs
    for (const job of this.jobs.values()) {
      if (job.status === JobStatus.PENDING) {
        job.status = JobStatus.CANCELLED;
      }
    }
    
    // Wait for processing jobs to complete
    while (this.processingJobs.size > 0) {
      await this.sleep(100);
    }
    
    // Clear all jobs except those that are still processing
    const processingJobIds = Array.from(this.processingJobs);
    for (const [jobId] of this.jobs) {
      if (!processingJobIds.includes(jobId)) {
        this.jobs.delete(jobId);
      }
    }
  }

  async getJobById(jobId: JobId): Promise<CalculationJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async retryFailedJob(jobId: JobId): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.FAILED) {
      throw new Error(`Job ${jobId} not found or not in failed state`);
    }

    if (job.retryCount >= job.maxRetries) {
      throw new Error(`Job ${jobId} has exceeded maximum retry attempts`);
    }

    job.status = JobStatus.PENDING;
    job.error = undefined;
    job.retryCount++;

    if (!this.isProcessing && !this.isPaused && this.config.enabled) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private hasPendingJobs(): boolean {
    return Array.from(this.jobs.values()).some(job => job.status === JobStatus.PENDING);
  }

  private getNextJobs(count: number): CalculationJob[] {
    const now = new Date();
    
    return Array.from(this.jobs.values())
      .filter(job => {
        // Only include pending jobs that are ready to be processed
        if (job.status !== JobStatus.PENDING) return false;
        
        // If job has a retry timestamp, check if it's time to retry
        if (job.nextRetryAt && job.nextRetryAt > now) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by priority (higher first), then by creation time (older first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, count);
  }

  private async processJob(job: CalculationJob): Promise<void> {
    job.status = JobStatus.PROCESSING;
    job.startedAt = new Date();
    this.processingJobs.add(job.id);

    const context: ErrorContext = {
      operation: 'queue-job-processing',
      ligaId: job.ligaId,
      saisonId: job.saisonId,
      jobId: job.id,
      timestamp: new Date(),
      metadata: {
        priority: job.priority,
        retryCount: job.retryCount,
        trigger: job.trigger
      }
    };

    let timeoutId: NodeJS.Timeout;
    let isTimedOut = false;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        isTimedOut = true;
        reject(new Error(`Job timeout after ${this.config.jobTimeout}ms`));
      }, this.config.jobTimeout);
    });

    try {
      // Race between actual processing and timeout
      await Promise.race([
        this.executeCalculation(job),
        timeoutPromise
      ]);

      // Clear timeout if job completed successfully
      if (!isTimedOut) {
        clearTimeout(timeoutId!);
      }
      
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      this.updateMetrics(job, true);
      this.releaseLock(job);
      
      strapi.log.info('Job completed successfully', {
        jobId: job.id,
        ligaId: job.ligaId,
        saisonId: job.saisonId,
        duration: job.completedAt.getTime() - job.startedAt!.getTime()
      });
      
    } catch (error) {
      if (!isTimedOut) {
        clearTimeout(timeoutId!);
      }
      
      // Create structured automation error
      const automationError = ErrorClassifier.createAutomationError(
        error instanceof Error ? error : new Error(String(error)),
        context,
        {
          jobId: job.id,
          retryCount: job.retryCount,
          timeoutCount: job.timeoutCount
        }
      );

      // Handle the error through structured error handler
      const handlingResult = await this.errorHandler.handleError(automationError);
      
      // Add error to job history
      job.errorHistory.push({
        message: automationError.message,
        timestamp: new Date(),
        retryCount: job.retryCount,
        isTimeout: automationError.type === AutomationErrorType.TIMEOUT_ERROR,
        isRetryable: automationError.retryable
      });
      
      if (automationError.type === AutomationErrorType.TIMEOUT_ERROR) {
        job.timeoutCount++;
        this.metrics.timeoutRate = this.calculateTimeoutRate();
      }
      
      job.error = automationError.message;
      
      // Handle based on error handling result
      if (handlingResult.handled && handlingResult.retryAfter !== undefined && 
          job.retryCount < job.maxRetries && automationError.retryable) {
        
        // Schedule retry based on error handler recommendation
        job.nextRetryAt = new Date(Date.now() + handlingResult.retryAfter);
        job.lastRetryAt = new Date();
        job.status = JobStatus.PENDING;
        job.retryCount++;
        
        this.metrics.retryRate = this.calculateRetryRate();
        
        // Don't immediately retry, let the retry interval handle it
      } else {
        // Move to dead letter queue if max retries exceeded
        job.status = JobStatus.FAILED;
        job.completedAt = new Date();
        this.releaseLock(job);
        this.moveToDeadLetterQueue(job);
      }
      
      this.updateMetrics(job, false);
    } finally {
      this.processingJobs.delete(job.id);
      
      // If no more jobs are processing and no pending jobs, mark as not running
      if (this.processingJobs.size === 0 && !this.hasPendingJobs()) {
        this.isProcessing = false;
      }
    }
  }

  private async executeCalculation(job: CalculationJob): Promise<void> {
    // Call the table calculation service
    await this.tabellenService.calculateTableForLiga(job.ligaId, job.saisonId);
  }



  private async waitForSlot(): Promise<void> {
    return new Promise(resolve => {
      const checkSlot = () => {
        if (this.processingJobs.size < this.config.concurrency) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateMetrics(job: CalculationJob, success: boolean): void {
    // Only count as processed if it's the final outcome (success or moved to dead letter)
    if (success || job.status === JobStatus.FAILED) {
      this.metrics.totalProcessed++;
      
      if (success) {
        const processingTime = job.completedAt!.getTime() - job.startedAt!.getTime();
        this.metrics.averageProcessingTime = 
          (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + processingTime) / 
          this.metrics.totalProcessed;
      }

      this.metrics.successRate = this.calculateSuccessRate();
      this.metrics.errorRate = this.calculateErrorRate();
    }
  }

  private calculateSuccessRate(): number {
    const completedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === JobStatus.COMPLETED).length;
    return this.metrics.totalProcessed > 0 ? (completedJobs / this.metrics.totalProcessed) * 100 : 0;
  }

  private calculateErrorRate(): number {
    const failedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === JobStatus.FAILED).length;
    return this.metrics.totalProcessed > 0 ? (failedJobs / this.metrics.totalProcessed) * 100 : 0;
  }

  private calculateRetryRate(): number {
    const retriedJobs = Array.from(this.jobs.values())
      .filter(job => job.retryCount > 0).length;
    return this.jobs.size > 0 ? (retriedJobs / this.jobs.size) * 100 : 0;
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, this.config.cleanupInterval);
  }

  private cleanupOldJobs(): void {
    const jobs = Array.from(this.jobs.entries());
    
    // Keep only the most recent completed jobs
    const completedJobs = jobs
      .filter(([_, job]) => job.status === JobStatus.COMPLETED)
      .sort(([_, a], [__, b]) => b.completedAt!.getTime() - a.completedAt!.getTime());
    
    if (completedJobs.length > this.config.maxCompletedJobs) {
      const jobsToRemove = completedJobs.slice(this.config.maxCompletedJobs);
      jobsToRemove.forEach(([jobId]) => this.jobs.delete(jobId));
    }

    // Keep only the most recent failed jobs
    const failedJobs = jobs
      .filter(([_, job]) => job.status === JobStatus.FAILED)
      .sort(([_, a], [__, b]) => b.completedAt!.getTime() - a.completedAt!.getTime());
    
    if (failedJobs.length > this.config.maxFailedJobs) {
      const jobsToRemove = failedJobs.slice(this.config.maxFailedJobs);
      jobsToRemove.forEach(([jobId]) => this.jobs.delete(jobId));
    }
  }

  public getMetrics(): JobMetrics {
    return { ...this.metrics };
  }

  public getHealthStatus(): QueueHealthStatus {
    const now = new Date();
    const status = this.getQueueStatus();
    
    // Calculate health based on various factors
    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: string[] = [];
    
    // Check if queue is overloaded
    if (status.pendingJobs > 50) {
      health = 'degraded';
      issues.push(`High pending job count: ${status.pendingJobs}`);
    }
    
    // Check if there are too many failed jobs
    if (status.failedJobs > 10) {
      health = 'degraded';
      issues.push(`High failed job count: ${status.failedJobs}`);
    }
    
    // Check if queue is stuck (no processing for too long)
    if (status.lastProcessedAt && (now.getTime() - status.lastProcessedAt.getTime()) > 300000) { // 5 minutes
      health = 'unhealthy';
      issues.push('Queue appears to be stuck - no jobs processed in 5 minutes');
    }
    
    // Check error rate
    if (this.metrics.errorRate > 50) {
      health = 'unhealthy';
      issues.push(`High error rate: ${this.metrics.errorRate.toFixed(1)}%`);
    }
    
    // Check if queue is paused
    if (this.isPaused) {
      health = 'degraded';
      issues.push('Queue is paused');
    }
    
    return {
      status: health,
      timestamp: now,
      queueStatus: status,
      metrics: this.metrics,
      issues,
      activeLocks: this.jobLocks.size,
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  public getDetailedStatus(): DetailedQueueStatus {
    const jobs = Array.from(this.jobs.values());
    const deadLetterJobs = Array.from(this.deadLetterJobs.values());
    
    return {
      ...this.getQueueStatus(),
      jobs: jobs.map(job => ({
        id: job.id,
        ligaId: job.ligaId,
        saisonId: job.saisonId,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        retryCount: job.retryCount,
        timeoutCount: job.timeoutCount,
        error: job.error,
        nextRetryAt: job.nextRetryAt
      })),
      deadLetterJobs: deadLetterJobs.map(job => ({
        id: job.id,
        ligaId: job.ligaId,
        saisonId: job.saisonId,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        retryCount: job.retryCount,
        timeoutCount: job.timeoutCount,
        error: job.error,
        errorHistory: job.errorHistory
      })),
      activeLocks: Array.from(this.jobLocks.entries()).map(([key, jobId]) => ({
        key,
        jobId,
        job: this.jobs.get(jobId) || this.deadLetterJobs.get(jobId)
      })),
      config: this.config
    };
  }

  private calculateMemoryUsage(): MemoryUsage {
    const jobsSize = this.jobs.size;
    const deadLetterSize = this.deadLetterJobs.size;
    const locksSize = this.jobLocks.size;
    
    // Rough estimation of memory usage
    const estimatedJobSize = 1024; // ~1KB per job
    const totalEstimatedMemory = (jobsSize + deadLetterSize) * estimatedJobSize;
    
    return {
      totalJobs: jobsSize + deadLetterSize,
      activeLocks: locksSize,
      estimatedMemoryBytes: totalEstimatedMemory,
      estimatedMemoryMB: Math.round(totalEstimatedMemory / 1024 / 1024 * 100) / 100
    };
  }

  getDeadLetterJobs(): CalculationJob[] {
    return Array.from(this.deadLetterJobs.values());
  }

  async reprocessDeadLetterJob(jobId: JobId): Promise<void> {
    const job = this.deadLetterJobs.get(jobId);
    if (!job) {
      throw new Error(`Dead letter job ${jobId} not found`);
    }

    // Reset job for reprocessing
    job.status = JobStatus.PENDING;
    job.retryCount = 0;
    job.timeoutCount = 0;
    job.error = undefined;
    job.nextRetryAt = undefined;
    job.lastRetryAt = undefined;
    job.errorHistory = [];
    job.startedAt = undefined;
    job.completedAt = undefined;

    // Move back to main queue
    this.jobs.set(jobId, job);
    this.deadLetterJobs.delete(jobId);

    // Start processing if not already running
    if (this.config.enabled && !this.isProcessing && !this.isPaused) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  async clearDeadLetterQueue(): Promise<void> {
    this.deadLetterJobs.clear();
    this.metrics.deadLetterCount = 0;
  }

  private moveToDeadLetterQueue(job: CalculationJob): void {
    this.deadLetterJobs.set(job.id, job);
    this.jobs.delete(job.id);
    this.metrics.deadLetterCount = this.deadLetterJobs.size;
  }

  private releaseLock(job: CalculationJob): void {
    const lockKey = `${job.ligaId}-${job.saisonId}`;
    const lockedJobId = this.jobLocks.get(lockKey);
    if (lockedJobId === job.id) {
      this.jobLocks.delete(lockKey);
    }
  }

  private startRetryInterval(): void {
    this.retryInterval = setInterval(() => {
      this.processRetryableJobs();
    }, 5000); // Check every 5 seconds for jobs ready to retry
  }

  private processRetryableJobs(): void {
    const now = new Date();
    
    for (const job of this.jobs.values()) {
      if (job.status === JobStatus.PENDING && 
          job.nextRetryAt && 
          job.nextRetryAt <= now) {
        // Clear the retry timestamp so it can be processed normally
        job.nextRetryAt = undefined;
        
        // Start processing if not already running
        if (this.config.enabled && !this.isProcessing && !this.isPaused) {
          setTimeout(() => this.processQueue(), 0);
          break; // Only trigger once per interval
        }
      }
    }
  }

  private calculateTimeoutRate(): number {
    const timeoutJobs = Array.from(this.jobs.values())
      .filter(job => job.timeoutCount > 0).length;
    return this.jobs.size > 0 ? (timeoutJobs / this.jobs.size) * 100 : 0;
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'database_error', 
      'timeout_error', 
      'concurrency_error',
      'connection_error',
      'temporary_error',
      'Job timeout'
    ];
    const errorMessage = error instanceof Error ? error.message : String(error);
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  private calculateRetryDelay(retryCount: number): number {
    if (this.config.backoff.type === 'exponential') {
      const baseDelay = this.config.backoff.delay;
      const exponentialDelay = baseDelay * Math.pow(2, retryCount);
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * exponentialDelay;
      const delay = exponentialDelay + jitter;
      
      return Math.min(delay, this.config.backoff.maxDelay);
    }
    return this.config.retryDelay;
  }

  async getJobHistory(ligaId: number, limit: number = 50): Promise<CalculationHistoryEntry[]> {
    const allJobs = [
      ...Array.from(this.jobs.values()),
      ...Array.from(this.deadLetterJobs.values())
    ];

    const filteredJobs = allJobs
      .filter(job => job.ligaId === ligaId)
      .filter(job => job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED)
      .sort((a, b) => {
        const aTime = a.completedAt || a.startedAt || a.createdAt;
        const bTime = b.completedAt || b.startedAt || b.createdAt;
        return bTime.getTime() - aTime.getTime();
      })
      .slice(0, limit);

    return filteredJobs.map(job => {
      const duration = job.startedAt && job.completedAt 
        ? job.completedAt.getTime() - job.startedAt.getTime()
        : undefined;

      return {
        id: job.id,
        ligaId: job.ligaId,
        saisonId: job.saisonId,
        trigger: job.trigger || 'UNKNOWN',
        status: job.status,
        startedAt: job.startedAt || job.createdAt,
        completedAt: job.completedAt,
        duration,
        error: job.error,
        entriesUpdated: 0, // This would need to be tracked during calculation
        description: job.description
      };
    });
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
    this.clearQueue();
  }
}

export interface CalculationJob {
  id: JobId;
  ligaId: number;
  saisonId: number;
  priority: Priority;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  lastRetryAt?: Date;
  timeoutCount: number;
  data?: any;
  errorHistory: JobError[];
  trigger?: string;
  description?: string;
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
}

export interface QueueConfiguration {
  concurrency: number;
  maxRetries: number;
  retryDelay: number;
  jobTimeout: number;
  cleanupInterval: number;
  maxCompletedJobs: number;
  maxFailedJobs: number;
  enabled?: boolean;
  retryConfig?: {
    maxRetries: number;
    backoffType: 'exponential' | 'linear';
    baseDelay: number;
    maxDelay: number;
    jitter: boolean;
  };
  backoff?: {
    type: 'exponential' | 'linear';
    delay: number;
    maxDelay: number;
  };
}

export type JobId = string;

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

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  timestamp: Date;
}

export interface RetryConfig {
  maxRetries: number;
  backoffType: 'fixed' | 'exponential';
  baseDelay: number;
  maxDelay: number;
}

export interface JobMetrics {
  totalProcessed: number;
  successRate: number;
  averageProcessingTime: number;
  errorRate: number;
  retryRate: number;
  timeoutRate: number;
  deadLetterCount: number;
}

export interface JobError {
  message: string;
  timestamp: Date;
  retryCount: number;
  isTimeout: boolean;
  isRetryable: boolean;
}

export interface QueueHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  queueStatus: QueueStatus;
  metrics: JobMetrics;
  issues: string[];
  activeLocks: number;
  memoryUsage: MemoryUsage;
}

export interface DetailedQueueStatus extends QueueStatus {
  jobs: JobSummary[];
  deadLetterJobs: JobSummary[];
  activeLocks: LockInfo[];
  config: QueueConfiguration;
}

export interface JobSummary {
  id: JobId;
  ligaId: number;
  saisonId: number;
  status: JobStatus;
  priority: Priority;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  timeoutCount: number;
  error?: string;
  nextRetryAt?: Date;
  errorHistory?: JobError[];
}

export interface LockInfo {
  key: string;
  jobId: JobId;
  job?: CalculationJob;
}

export interface MemoryUsage {
  totalJobs: number;
  activeLocks: number;
  estimatedMemoryBytes: number;
  estimatedMemoryMB: number;
}

export interface CalculationHistoryEntry {
  id: string;
  ligaId: number;
  saisonId: number;
  trigger: string;
  status: JobStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  entriesUpdated: number;
  description?: string;
}