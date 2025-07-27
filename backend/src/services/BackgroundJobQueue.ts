/**
 * Background Job Queue System
 * 
 * Implements background job queue for calculations with priority support,
 * job scheduling, status tracking, and worker management.
 * 
 * Supports Requirements 5.4 (async processing) and 3.3 (background jobs).
 */

import { AsyncCalculation, CalculationContext, CalculationStatus } from './CalculationService';

/**
 * Job priority levels
 */
type JobPriority = 'high' | 'medium' | 'low';

/**
 * Job status types
 */
type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';

/**
 * Background job interface
 */
interface BackgroundJob {
  id: string;
  name: string;
  type: 'calculation' | 'maintenance' | 'notification';
  priority: JobPriority;
  status: JobStatus;
  data: any;
  context?: CalculationContext;
  calculation?: AsyncCalculation;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  executionTime?: number;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  progress?: number;
  dependencies?: string[]; // Job IDs this job depends on
}

/**
 * Job worker interface
 */
interface JobWorker {
  id: string;
  status: 'idle' | 'busy' | 'stopped';
  currentJob?: string;
  processedJobs: number;
  startedAt: Date;
  lastActivity: Date;
}

/**
 * Queue statistics
 */
interface QueueStatistics {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  queueLength: number;
  activeWorkers: number;
  jobsByPriority: Record<JobPriority, number>;
  jobsByType: Record<string, number>;
}

/**
 * Queue configuration
 */
interface QueueConfiguration {
  maxWorkers: number;
  maxQueueSize: number;
  defaultTimeout: number;
  defaultRetries: number;
  cleanupInterval: number; // How often to clean completed jobs (ms)
  maxJobAge: number; // Max age for completed jobs before cleanup (ms)
  priorityWeights: Record<JobPriority, number>;
  enableJobPersistence: boolean;
}

/**
 * Job execution result
 */
interface JobExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  retryRecommended?: boolean;
}

/**
 * Default queue configuration
 */
const DEFAULT_QUEUE_CONFIG: QueueConfiguration = {
  maxWorkers: 3,
  maxQueueSize: 100,
  defaultTimeout: 30000, // 30 seconds
  defaultRetries: 2,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  maxJobAge: 60 * 60 * 1000, // 1 hour
  priorityWeights: {
    high: 1,
    medium: 2,
    low: 3
  },
  enableJobPersistence: false // For now, keep jobs in memory
};

/**
 * Background Job Queue Class
 */
export class BackgroundJobQueue {
  private strapi: any;
  private config: QueueConfiguration;
  private jobs: Map<string, BackgroundJob> = new Map();
  private workers: Map<string, JobWorker> = new Map();
  private pendingQueue: BackgroundJob[] = [];
  private runningJobs: Set<string> = new Set();
  private completedJobs: Set<string> = new Set();
  private failedJobs: Set<string> = new Set();
  private cleanupInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(strapi: any, config: Partial<QueueConfiguration> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    
    this.logInfo('BackgroundJobQueue initialized', {
      maxWorkers: this.config.maxWorkers,
      maxQueueSize: this.config.maxQueueSize
    });
  }

  /**
   * Start the job queue and workers
   */
  start(): void {
    if (this.isRunning) {
      this.logWarn('Job queue is already running');
      return;
    }

    this.isRunning = true;
    
    // Initialize workers
    this.initializeWorkers();
    
    // Start cleanup interval
    this.startCleanupInterval();
    
    this.logInfo('Job queue started', {
      workers: this.workers.size,
      pendingJobs: this.pendingQueue.length
    });
  }

  /**
   * Stop the job queue and workers
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Wait for running jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.runningJobs.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force stop remaining jobs
    for (const jobId of this.runningJobs) {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'cancelled';
        job.completedAt = new Date();
      }
    }
    
    // Stop all workers
    for (const worker of this.workers.values()) {
      worker.status = 'stopped';
    }
    
    this.logInfo('Job queue stopped', {
      cancelledJobs: this.runningJobs.size
    });
  }

  /**
   * Add a calculation job to the queue
   */
  addCalculationJob(
    calculation: AsyncCalculation,
    data: any,
    context: CalculationContext
  ): string {
    const jobId = this.generateJobId(calculation.name, context);
    
    const job: BackgroundJob = {
      id: jobId,
      name: calculation.name,
      type: 'calculation',
      priority: calculation.priority,
      status: 'pending',
      data,
      context,
      calculation,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: calculation.retryAttempts || this.config.defaultRetries,
      timeout: calculation.timeout || this.config.defaultTimeout
    };

    return this.addJob(job);
  }

  /**
   * Add a generic job to the queue
   */
  addJob(job: BackgroundJob): string {
    // Check queue size limit
    if (this.pendingQueue.length >= this.config.maxQueueSize) {
      throw new Error('Job queue is full');
    }

    // Store job
    this.jobs.set(job.id, job);
    
    // Add to pending queue with priority sorting
    this.insertJobByPriority(job);
    
    // Try to process immediately if workers are available
    if (this.isRunning) {
      this.processNextJob();
    }

    this.logDebug(`Job added to queue: ${job.name}`, {
      jobId: job.id,
      priority: job.priority,
      queueLength: this.pendingQueue.length
    });

    return job.id;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): CalculationStatus | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      startTime: job.createdAt,
      endTime: job.completedAt,
      executionTime: job.executionTime
    };
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'pending') {
      // Remove from pending queue
      const index = this.pendingQueue.findIndex(j => j.id === jobId);
      if (index !== -1) {
        this.pendingQueue.splice(index, 1);
      }
      
      job.status = 'cancelled';
      job.completedAt = new Date();
      
      this.logInfo(`Job cancelled: ${job.name}`, { jobId });
      return true;
    }

    if (job.status === 'running') {
      // Mark for cancellation (worker will check this)
      job.status = 'cancelled';
      this.logInfo(`Job marked for cancellation: ${job.name}`, { jobId });
      return true;
    }

    return false;
  }

  /**
   * Retry a failed job
   */
  retryJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') return false;

    if (job.retryCount >= job.maxRetries) {
      this.logWarn(`Job retry limit exceeded: ${job.name}`, { jobId });
      return false;
    }

    // Reset job status
    job.status = 'pending';
    job.retryCount++;
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.executionTime = undefined;
    job.error = undefined;
    job.result = undefined;

    // Add back to queue
    this.insertJobByPriority(job);
    this.failedJobs.delete(jobId);

    // Try to process immediately
    if (this.isRunning) {
      this.processNextJob();
    }

    this.logInfo(`Job queued for retry: ${job.name}`, {
      jobId,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries
    });

    return true;
  }

  /**
   * Get queue statistics
   */
  getStatistics(): QueueStatistics {
    const jobsByPriority: Record<JobPriority, number> = {
      high: 0,
      medium: 0,
      low: 0
    };

    const jobsByType: Record<string, number> = {};
    let totalExecutionTime = 0;
    let completedJobsCount = 0;

    for (const job of this.jobs.values()) {
      jobsByPriority[job.priority]++;
      jobsByType[job.type] = (jobsByType[job.type] || 0) + 1;
      
      if (job.executionTime) {
        totalExecutionTime += job.executionTime;
        completedJobsCount++;
      }
    }

    return {
      totalJobs: this.jobs.size,
      pendingJobs: this.pendingQueue.length,
      runningJobs: this.runningJobs.size,
      completedJobs: this.completedJobs.size,
      failedJobs: this.failedJobs.size,
      averageExecutionTime: completedJobsCount > 0 ? totalExecutionTime / completedJobsCount : 0,
      queueLength: this.pendingQueue.length,
      activeWorkers: Array.from(this.workers.values()).filter(w => w.status === 'busy').length,
      jobsByPriority,
      jobsByType
    };
  }

  /**
   * Get all jobs with optional filtering
   */
  getJobs(filter?: {
    status?: JobStatus;
    type?: string;
    priority?: JobPriority;
    limit?: number;
  }): BackgroundJob[] {
    let jobs = Array.from(this.jobs.values());

    if (filter) {
      if (filter.status) {
        jobs = jobs.filter(job => job.status === filter.status);
      }
      if (filter.type) {
        jobs = jobs.filter(job => job.type === filter.type);
      }
      if (filter.priority) {
        jobs = jobs.filter(job => job.priority === filter.priority);
      }
      if (filter.limit) {
        jobs = jobs.slice(0, filter.limit);
      }
    }

    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): number {
    const completedJobIds = Array.from(this.completedJobs);
    let cleared = 0;

    for (const jobId of completedJobIds) {
      const job = this.jobs.get(jobId);
      if (job && job.status === 'completed') {
        this.jobs.delete(jobId);
        this.completedJobs.delete(jobId);
        cleared++;
      }
    }

    this.logDebug(`Cleared ${cleared} completed jobs`);
    return cleared;
  }

  /**
   * Initialize worker threads/processes
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.config.maxWorkers; i++) {
      const workerId = `worker-${i + 1}`;
      const worker: JobWorker = {
        id: workerId,
        status: 'idle',
        processedJobs: 0,
        startedAt: new Date(),
        lastActivity: new Date()
      };
      
      this.workers.set(workerId, worker);
    }

    this.logDebug(`Initialized ${this.config.maxWorkers} workers`);
  }

  /**
   * Process next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (!this.isRunning || this.pendingQueue.length === 0) {
      return;
    }

    // Find available worker
    const availableWorker = Array.from(this.workers.values()).find(w => w.status === 'idle');
    if (!availableWorker) {
      return; // No available workers
    }

    // Get next job
    const job = this.pendingQueue.shift();
    if (!job) return;

    // Assign job to worker
    availableWorker.status = 'busy';
    availableWorker.currentJob = job.id;
    availableWorker.lastActivity = new Date();

    // Update job status
    job.status = 'running';
    job.startedAt = new Date();
    this.runningJobs.add(job.id);

    this.logDebug(`Job started: ${job.name}`, {
      jobId: job.id,
      workerId: availableWorker.id
    });

    // Execute job
    try {
      const result = await this.executeJob(job);
      await this.handleJobCompletion(job, availableWorker, result);
    } catch (error) {
      await this.handleJobError(job, availableWorker, error);
    }

    // Try to process next job
    setImmediate(() => this.processNextJob());
  }

  /**
   * Execute a job
   */
  private async executeJob(job: BackgroundJob): Promise<JobExecutionResult> {
    const startTime = Date.now();

    try {
      // Check if job was cancelled
      if (job.status === 'cancelled') {
        return {
          success: false,
          error: 'Job was cancelled',
          executionTime: Date.now() - startTime
        };
      }

      let result: any;

      if (job.type === 'calculation' && job.calculation) {
        // Execute calculation with timeout
        const calculationPromise = job.calculation.calculator(job.data, job.context);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Job timeout')), job.timeout)
        );

        result = await Promise.race([calculationPromise, timeoutPromise]);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Determine if retry is recommended
      const retryRecommended = 
        error.message.includes('timeout') || 
        error.message.includes('network') ||
        error.message.includes('connection');

      return {
        success: false,
        error: error.message,
        executionTime,
        retryRecommended
      };
    }
  }

  /**
   * Handle successful job completion
   */
  private async handleJobCompletion(
    job: BackgroundJob,
    worker: JobWorker,
    result: JobExecutionResult
  ): Promise<void> {
    // Update job
    job.status = result.success ? 'completed' : 'failed';
    job.completedAt = new Date();
    job.executionTime = result.executionTime;
    job.result = result.result;
    job.error = result.error;

    // Update worker
    worker.status = 'idle';
    worker.currentJob = undefined;
    worker.processedJobs++;
    worker.lastActivity = new Date();

    // Update tracking sets
    this.runningJobs.delete(job.id);
    
    if (result.success) {
      this.completedJobs.add(job.id);
      this.logDebug(`Job completed: ${job.name}`, {
        jobId: job.id,
        executionTime: result.executionTime
      });
    } else {
      // Check if retry is needed
      if (job.retryCount < job.maxRetries && result.retryRecommended) {
        this.logWarn(`Job failed, will retry: ${job.name}`, {
          jobId: job.id,
          error: result.error,
          retryCount: job.retryCount + 1
        });
        
        // Schedule retry
        setTimeout(() => this.retryJob(job.id), 1000 * Math.pow(2, job.retryCount)); // Exponential backoff
      } else {
        this.failedJobs.add(job.id);
        this.logError(`Job failed permanently: ${job.name}`, {
          jobId: job.id,
          error: result.error,
          retryCount: job.retryCount
        });
      }
    }
  }

  /**
   * Handle job execution error
   */
  private async handleJobError(
    job: BackgroundJob,
    worker: JobWorker,
    error: any
  ): Promise<void> {
    const result: JobExecutionResult = {
      success: false,
      error: error.message,
      executionTime: Date.now() - (job.startedAt?.getTime() || Date.now()),
      retryRecommended: true
    };

    await this.handleJobCompletion(job, worker, result);
  }

  /**
   * Insert job into queue by priority
   */
  private insertJobByPriority(job: BackgroundJob): void {
    const weight = this.config.priorityWeights[job.priority];
    
    // Find insertion point based on priority
    let insertIndex = 0;
    for (let i = 0; i < this.pendingQueue.length; i++) {
      const existingWeight = this.config.priorityWeights[this.pendingQueue[i].priority];
      if (weight < existingWeight) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    this.pendingQueue.splice(insertIndex, 0, job);
  }

  /**
   * Start cleanup interval for old jobs
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up old completed jobs
   */
  private cleanupOldJobs(): void {
    const now = Date.now();
    const jobsToDelete: string[] = [];

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        const age = now - (job.completedAt?.getTime() || job.createdAt.getTime());
        if (age > this.config.maxJobAge) {
          jobsToDelete.push(jobId);
        }
      }
    }

    for (const jobId of jobsToDelete) {
      this.jobs.delete(jobId);
      this.completedJobs.delete(jobId);
      this.failedJobs.delete(jobId);
    }

    if (jobsToDelete.length > 0) {
      this.logDebug(`Cleaned up ${jobsToDelete.length} old jobs`);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(name: string, context?: CalculationContext): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const operationId = context?.operationId ? `-${context.operationId}` : '';
    return `${name}${operationId}-${timestamp}-${random}`;
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[BackgroundJobQueue] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[BackgroundJobQueue] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[BackgroundJobQueue] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[BackgroundJobQueue] ${message}`, error);
  }
}

/**
 * Singleton job queue instance
 */
let jobQueueInstance: BackgroundJobQueue | null = null;

/**
 * Get or create job queue instance
 */
export function getBackgroundJobQueue(
  strapi?: any,
  config?: Partial<QueueConfiguration>
): BackgroundJobQueue {
  if (!jobQueueInstance && strapi) {
    jobQueueInstance = new BackgroundJobQueue(strapi, config);
  }
  
  if (!jobQueueInstance) {
    throw new Error('BackgroundJobQueue not initialized. Call with strapi instance first.');
  }
  
  return jobQueueInstance;
}

/**
 * Initialize job queue with strapi instance
 */
export function initializeBackgroundJobQueue(
  strapi: any,
  config?: Partial<QueueConfiguration>
): BackgroundJobQueue {
  jobQueueInstance = new BackgroundJobQueue(strapi, config);
  return jobQueueInstance;
}

/**
 * Reset job queue instance (mainly for testing)
 */
export function resetBackgroundJobQueue(): void {
  if (jobQueueInstance) {
    jobQueueInstance.stop();
  }
  jobQueueInstance = null;
}

export default BackgroundJobQueue;
export type {
  BackgroundJob,
  JobWorker,
  QueueStatistics,
  QueueConfiguration,
  JobExecutionResult,
  JobPriority,
  JobStatus
};