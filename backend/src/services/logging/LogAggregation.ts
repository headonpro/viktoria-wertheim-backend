/**
 * Log Aggregation and Indexing
 * 
 * Provides log aggregation, indexing, and search capabilities for
 * comprehensive log analysis and monitoring.
 * 
 * Features:
 * - Log aggregation by time windows
 * - Full-text search and filtering
 * - Log indexing for fast queries
 * - Batch processing for performance
 * - Configurable retention policies
 */

import { LogEntry, LogLevel, LogStats, LogAggregator } from './StructuredLogger';

/**
 * Log search criteria
 */
export interface LogSearchCriteria {
  level?: LogLevel;
  contentType?: string;
  hookType?: string;
  message?: string;
  startTime?: Date;
  endTime?: Date;
  tags?: string[];
  requestId?: string;
  operationId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Log search result
 */
export interface LogSearchResult {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
  aggregations?: {
    byLevel: Record<LogLevel, number>;
    byContentType: Record<string, number>;
    byHookType: Record<string, number>;
    byTimeWindow: Array<{ timestamp: Date; count: number }>;
  };
}

/**
 * Log retention policy
 */
export interface LogRetentionPolicy {
  maxAge: number; // in milliseconds
  maxCount: number;
  compressOld: boolean;
  archiveOld: boolean;
}

/**
 * Log index for fast searching
 */
interface LogIndex {
  byLevel: Map<LogLevel, Set<number>>;
  byContentType: Map<string, Set<number>>;
  byHookType: Map<string, Set<number>>;
  byRequestId: Map<string, Set<number>>;
  byOperationId: Map<string, Set<number>>;
  byTags: Map<string, Set<number>>;
  byTimeWindow: Map<string, Set<number>>; // YYYY-MM-DD-HH format
}

/**
 * Time window aggregation
 */
interface TimeWindowStats {
  timestamp: Date;
  count: number;
  errorCount: number;
  warnCount: number;
  avgExecutionTime: number;
  topErrors: Array<{ message: string; count: number }>;
}

/**
 * Advanced log aggregator with indexing and search
 */
export class AdvancedLogAggregator implements LogAggregator {
  private logs: LogEntry[] = [];
  private index: LogIndex;
  private retentionPolicy: LogRetentionPolicy;
  private batchSize: number = 100;
  private processingQueue: LogEntry[] = [];
  private isProcessing: boolean = false;

  constructor(retentionPolicy?: Partial<LogRetentionPolicy>) {
    this.retentionPolicy = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxCount: 100000,
      compressOld: false,
      archiveOld: false,
      ...retentionPolicy
    };

    this.index = this.createEmptyIndex();
    
    // Start periodic cleanup
    this.startCleanupTimer();
  }

  /**
   * Aggregate log entry
   */
  async aggregate(entry: LogEntry): Promise<void> {
    this.processingQueue.push(entry);
    
    if (!this.isProcessing && this.processingQueue.length >= this.batchSize) {
      await this.processBatch();
    }
  }

  /**
   * Flush pending logs
   */
  async flush(): Promise<void> {
    if (this.processingQueue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Get aggregated statistics
   */
  async getStats(): Promise<LogStats> {
    const stats: LogStats = {
      totalLogs: this.logs.length,
      logsByLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.FATAL]: 0
      },
      errorRate: 0,
      averageExecutionTime: 0,
      topErrors: [],
      recentLogs: this.logs.slice(-100)
    };

    // Calculate statistics
    let totalExecutionTime = 0;
    let executionTimeCount = 0;
    const errorCounts = new Map<string, number>();

    for (const log of this.logs) {
      stats.logsByLevel[log.level]++;
      
      if (log.performance?.executionTime) {
        totalExecutionTime += log.performance.executionTime;
        executionTimeCount++;
      }

      if (log.level >= LogLevel.ERROR && log.error) {
        const errorMessage = log.error.message;
        errorCounts.set(errorMessage, (errorCounts.get(errorMessage) || 0) + 1);
      }
    }

    // Calculate error rate
    const errorLogs = stats.logsByLevel[LogLevel.ERROR] + stats.logsByLevel[LogLevel.FATAL];
    stats.errorRate = stats.totalLogs > 0 ? errorLogs / stats.totalLogs : 0;

    // Calculate average execution time
    stats.averageExecutionTime = executionTimeCount > 0 ? totalExecutionTime / executionTimeCount : 0;

    // Get top errors
    stats.topErrors = Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Search logs with criteria
   */
  async search(criteria: LogSearchCriteria): Promise<LogSearchResult> {
    const matchingIndices = this.findMatchingIndices(criteria);
    const matchingLogs = matchingIndices
      .map(index => this.logs[index])
      .filter(log => log && this.matchesCriteria(log, criteria))
      .sort((a, b) => b.context.timestamp.getTime() - a.context.timestamp.getTime());

    const offset = criteria.offset || 0;
    const limit = criteria.limit || 100;
    const paginatedLogs = matchingLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total: matchingLogs.length,
      hasMore: offset + limit < matchingLogs.length,
      aggregations: this.calculateAggregations(matchingLogs)
    };
  }

  /**
   * Get time window statistics
   */
  async getTimeWindowStats(
    startTime: Date,
    endTime: Date,
    windowSize: number = 60 * 60 * 1000 // 1 hour
  ): Promise<TimeWindowStats[]> {
    const windows = new Map<string, TimeWindowStats>();
    
    for (const log of this.logs) {
      const timestamp = log.context.timestamp;
      if (timestamp >= startTime && timestamp <= endTime) {
        const windowKey = this.getTimeWindowKey(timestamp, windowSize);
        
        if (!windows.has(windowKey)) {
          windows.set(windowKey, {
            timestamp: new Date(Math.floor(timestamp.getTime() / windowSize) * windowSize),
            count: 0,
            errorCount: 0,
            warnCount: 0,
            avgExecutionTime: 0,
            topErrors: []
          });
        }

        const window = windows.get(windowKey)!;
        window.count++;

        if (log.level >= LogLevel.ERROR) {
          window.errorCount++;
        } else if (log.level === LogLevel.WARN) {
          window.warnCount++;
        }

        if (log.performance?.executionTime) {
          window.avgExecutionTime = 
            (window.avgExecutionTime * (window.count - 1) + log.performance.executionTime) / window.count;
        }
      }
    }

    return Array.from(windows.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Process batch of logs
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const batch = this.processingQueue.splice(0, this.batchSize);

    try {
      for (const entry of batch) {
        const index = this.logs.length;
        this.logs.push(entry);
        this.updateIndex(entry, index);
      }

      // Apply retention policy
      await this.applyRetentionPolicy();
    } finally {
      this.isProcessing = false;
    }

    // Process remaining queue if needed
    if (this.processingQueue.length >= this.batchSize) {
      setImmediate(() => this.processBatch());
    }
  }

  /**
   * Update search index
   */
  private updateIndex(entry: LogEntry, index: number): void {
    // Index by level
    if (!this.index.byLevel.has(entry.level)) {
      this.index.byLevel.set(entry.level, new Set());
    }
    this.index.byLevel.get(entry.level)!.add(index);

    // Index by content type
    if (entry.context.contentType) {
      if (!this.index.byContentType.has(entry.context.contentType)) {
        this.index.byContentType.set(entry.context.contentType, new Set());
      }
      this.index.byContentType.get(entry.context.contentType)!.add(index);
    }

    // Index by hook type
    if (entry.context.hookType) {
      if (!this.index.byHookType.has(entry.context.hookType)) {
        this.index.byHookType.set(entry.context.hookType, new Set());
      }
      this.index.byHookType.get(entry.context.hookType)!.add(index);
    }

    // Index by request ID
    if (entry.context.requestId) {
      if (!this.index.byRequestId.has(entry.context.requestId)) {
        this.index.byRequestId.set(entry.context.requestId, new Set());
      }
      this.index.byRequestId.get(entry.context.requestId)!.add(index);
    }

    // Index by operation ID
    if (entry.context.operationId) {
      if (!this.index.byOperationId.has(entry.context.operationId)) {
        this.index.byOperationId.set(entry.context.operationId, new Set());
      }
      this.index.byOperationId.get(entry.context.operationId)!.add(index);
    }

    // Index by tags
    if (entry.tags) {
      for (const tag of entry.tags) {
        if (!this.index.byTags.has(tag)) {
          this.index.byTags.set(tag, new Set());
        }
        this.index.byTags.get(tag)!.add(index);
      }
    }

    // Index by time window
    const timeWindow = this.getTimeWindowKey(entry.context.timestamp, 60 * 60 * 1000); // 1 hour
    if (!this.index.byTimeWindow.has(timeWindow)) {
      this.index.byTimeWindow.set(timeWindow, new Set());
    }
    this.index.byTimeWindow.get(timeWindow)!.add(index);
  }

  /**
   * Find matching indices based on criteria
   */
  private findMatchingIndices(criteria: LogSearchCriteria): number[] {
    let candidateIndices: Set<number> | null = null;

    // Filter by level
    if (criteria.level !== undefined) {
      const levelIndices = this.index.byLevel.get(criteria.level) || new Set();
      candidateIndices = this.intersectSets(candidateIndices, levelIndices);
    }

    // Filter by content type
    if (criteria.contentType) {
      const contentTypeIndices = this.index.byContentType.get(criteria.contentType) || new Set();
      candidateIndices = this.intersectSets(candidateIndices, contentTypeIndices);
    }

    // Filter by hook type
    if (criteria.hookType) {
      const hookTypeIndices = this.index.byHookType.get(criteria.hookType) || new Set();
      candidateIndices = this.intersectSets(candidateIndices, hookTypeIndices);
    }

    // Filter by request ID
    if (criteria.requestId) {
      const requestIdIndices = this.index.byRequestId.get(criteria.requestId) || new Set();
      candidateIndices = this.intersectSets(candidateIndices, requestIdIndices);
    }

    // Filter by operation ID
    if (criteria.operationId) {
      const operationIdIndices = this.index.byOperationId.get(criteria.operationId) || new Set();
      candidateIndices = this.intersectSets(candidateIndices, operationIdIndices);
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      for (const tag of criteria.tags) {
        const tagIndices = this.index.byTags.get(tag) || new Set();
        candidateIndices = this.intersectSets(candidateIndices, tagIndices);
      }
    }

    return candidateIndices ? Array.from(candidateIndices) : Array.from({ length: this.logs.length }, (_, i) => i);
  }

  /**
   * Check if log matches criteria
   */
  private matchesCriteria(log: LogEntry, criteria: LogSearchCriteria): boolean {
    // Time range filter
    if (criteria.startTime && log.context.timestamp < criteria.startTime) {
      return false;
    }
    if (criteria.endTime && log.context.timestamp > criteria.endTime) {
      return false;
    }

    // Message filter
    if (criteria.message && !log.message.toLowerCase().includes(criteria.message.toLowerCase())) {
      return false;
    }

    return true;
  }

  /**
   * Calculate aggregations for search results
   */
  private calculateAggregations(logs: LogEntry[]): LogSearchResult['aggregations'] {
    const byLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0
    };
    const byContentType: Record<string, number> = {};
    const byHookType: Record<string, number> = {};
    const timeWindows = new Map<string, number>();

    for (const log of logs) {
      byLevel[log.level]++;

      if (log.context.contentType) {
        byContentType[log.context.contentType] = (byContentType[log.context.contentType] || 0) + 1;
      }

      if (log.context.hookType) {
        byHookType[log.context.hookType] = (byHookType[log.context.hookType] || 0) + 1;
      }

      const timeWindow = this.getTimeWindowKey(log.context.timestamp, 60 * 60 * 1000);
      timeWindows.set(timeWindow, (timeWindows.get(timeWindow) || 0) + 1);
    }

    const byTimeWindow = Array.from(timeWindows.entries())
      .map(([key, count]) => ({
        timestamp: new Date(key),
        count
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      byLevel,
      byContentType,
      byHookType,
      byTimeWindow
    };
  }

  /**
   * Apply retention policy
   */
  private async applyRetentionPolicy(): Promise<void> {
    const now = Date.now();
    const cutoffTime = now - this.retentionPolicy.maxAge;

    // Remove old logs
    const originalLength = this.logs.length;
    this.logs = this.logs.filter(log => log.context.timestamp.getTime() > cutoffTime);

    // Limit by count
    if (this.logs.length > this.retentionPolicy.maxCount) {
      this.logs = this.logs.slice(-this.retentionPolicy.maxCount);
    }

    // Rebuild index if logs were removed
    if (this.logs.length < originalLength) {
      this.rebuildIndex();
    }
  }

  /**
   * Rebuild search index
   */
  private rebuildIndex(): void {
    this.index = this.createEmptyIndex();
    
    for (let i = 0; i < this.logs.length; i++) {
      this.updateIndex(this.logs[i], i);
    }
  }

  /**
   * Create empty index structure
   */
  private createEmptyIndex(): LogIndex {
    return {
      byLevel: new Map(),
      byContentType: new Map(),
      byHookType: new Map(),
      byRequestId: new Map(),
      byOperationId: new Map(),
      byTags: new Map(),
      byTimeWindow: new Map()
    };
  }

  /**
   * Intersect two sets
   */
  private intersectSets(set1: Set<number> | null, set2: Set<number>): Set<number> {
    if (!set1) return set2;
    
    const result = new Set<number>();
    for (const item of set1) {
      if (set2.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  /**
   * Get time window key
   */
  private getTimeWindowKey(timestamp: Date, windowSize: number): string {
    const windowStart = Math.floor(timestamp.getTime() / windowSize) * windowSize;
    return new Date(windowStart).toISOString();
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.applyRetentionPolicy().catch(console.error);
    }, 60 * 60 * 1000); // Run every hour
  }
}

export default AdvancedLogAggregator;