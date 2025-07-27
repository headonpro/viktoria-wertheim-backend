/**
 * Request Tracing System
 * 
 * Provides distributed tracing capabilities for tracking requests
 * across multiple hook operations and services.
 * 
 * Features:
 * - Request correlation across hook operations
 * - Distributed tracing with span tracking
 * - Performance monitoring per request
 * - Request flow visualization
 * - Context propagation
 */

// import { v4 as uuidv4 } from 'uuid';
const uuidv4 = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
import { LogContext } from './StructuredLogger';

/**
 * Trace span representing a unit of work
 */
export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{
    timestamp: Date;
    level: string;
    message: string;
    fields?: Record<string, any>;
  }>;
  status: 'pending' | 'success' | 'error';
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Request trace containing all spans
 */
export interface RequestTrace {
  traceId: string;
  rootSpanId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  spans: Map<string, TraceSpan>;
  metadata: {
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    contentType?: string;
    operation?: string;
  };
  status: 'active' | 'completed' | 'failed';
}

/**
 * Trace context for propagation
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

/**
 * Tracer configuration
 */
export interface TracerConfig {
  enabled: boolean;
  sampleRate: number; // 0.0 to 1.0
  maxSpansPerTrace: number;
  maxTraceAge: number; // in milliseconds
  enablePerformanceMonitoring: boolean;
  enableErrorTracking: boolean;
}

/**
 * Default tracer configuration
 */
const DEFAULT_TRACER_CONFIG: TracerConfig = {
  enabled: true,
  sampleRate: 1.0, // Trace all requests in development
  maxSpansPerTrace: 100,
  maxTraceAge: 60 * 60 * 1000, // 1 hour
  enablePerformanceMonitoring: true,
  enableErrorTracking: true
};

/**
 * Request tracer implementation
 */
export class RequestTracer {
  private config: TracerConfig;
  private activeTraces: Map<string, RequestTrace> = new Map();
  private completedTraces: RequestTrace[] = [];
  private maxCompletedTraces: number = 1000;

  constructor(config: Partial<TracerConfig> = {}) {
    this.config = { ...DEFAULT_TRACER_CONFIG, ...config };
    
    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string, metadata?: RequestTrace['metadata']): TraceContext {
    if (!this.config.enabled || !this.shouldSample()) {
      return this.createNoOpContext();
    }

    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    
    const rootSpan: TraceSpan = {
      spanId,
      traceId,
      operationName,
      startTime: new Date(),
      tags: {},
      logs: [],
      status: 'pending'
    };

    const trace: RequestTrace = {
      traceId,
      rootSpanId: spanId,
      startTime: new Date(),
      spans: new Map([[spanId, rootSpan]]),
      metadata: metadata || {},
      status: 'active'
    };

    this.activeTraces.set(traceId, trace);

    return {
      traceId,
      spanId,
      baggage: {}
    };
  }

  /**
   * Start a child span
   */
  startSpan(
    context: TraceContext,
    operationName: string,
    tags?: Record<string, any>
  ): TraceContext {
    if (!this.config.enabled || !context.traceId) {
      return this.createNoOpContext();
    }

    const trace = this.activeTraces.get(context.traceId);
    if (!trace) {
      return this.createNoOpContext();
    }

    // Check span limit
    if (trace.spans.size >= this.config.maxSpansPerTrace) {
      return context; // Return parent context
    }

    const spanId = this.generateSpanId();
    const span: TraceSpan = {
      spanId,
      traceId: context.traceId,
      parentSpanId: context.spanId,
      operationName,
      startTime: new Date(),
      tags: tags || {},
      logs: [],
      status: 'pending'
    };

    trace.spans.set(spanId, span);

    return {
      traceId: context.traceId,
      spanId,
      parentSpanId: context.spanId,
      baggage: context.baggage
    };
  }

  /**
   * Finish a span
   */
  finishSpan(
    context: TraceContext,
    status: 'success' | 'error' = 'success',
    error?: Error
  ): void {
    if (!this.config.enabled || !context.traceId) {
      return;
    }

    const trace = this.activeTraces.get(context.traceId);
    if (!trace) {
      return;
    }

    const span = trace.spans.get(context.spanId);
    if (!span) {
      return;
    }

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = status;

    if (error && this.config.enableErrorTracking) {
      span.error = {
        message: error.message,
        stack: error.stack
      };
      span.tags.error = true;
    }

    // If this is the root span, finish the trace
    if (context.spanId === trace.rootSpanId) {
      this.finishTrace(trace);
    }
  }

  /**
   * Add tags to a span
   */
  setTags(context: TraceContext, tags: Record<string, any>): void {
    if (!this.config.enabled || !context.traceId) {
      return;
    }

    const trace = this.activeTraces.get(context.traceId);
    if (!trace) {
      return;
    }

    const span = trace.spans.get(context.spanId);
    if (span) {
      Object.assign(span.tags, tags);
    }
  }

  /**
   * Add log entry to a span
   */
  logToSpan(
    context: TraceContext,
    level: string,
    message: string,
    fields?: Record<string, any>
  ): void {
    if (!this.config.enabled || !context.traceId) {
      return;
    }

    const trace = this.activeTraces.get(context.traceId);
    if (!trace) {
      return;
    }

    const span = trace.spans.get(context.spanId);
    if (span) {
      span.logs.push({
        timestamp: new Date(),
        level,
        message,
        fields
      });
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): RequestTrace | null {
    return this.activeTraces.get(traceId) || 
           this.completedTraces.find(t => t.traceId === traceId) || 
           null;
  }

  /**
   * Get all active traces
   */
  getActiveTraces(): RequestTrace[] {
    return Array.from(this.activeTraces.values());
  }

  /**
   * Get completed traces
   */
  getCompletedTraces(limit: number = 100): RequestTrace[] {
    return this.completedTraces.slice(-limit);
  }

  /**
   * Search traces by criteria
   */
  searchTraces(criteria: {
    operationName?: string;
    status?: RequestTrace['status'];
    minDuration?: number;
    maxDuration?: number;
    startTime?: Date;
    endTime?: Date;
    hasError?: boolean;
    contentType?: string;
    userId?: string;
  }): RequestTrace[] {
    const allTraces = [
      ...Array.from(this.activeTraces.values()),
      ...this.completedTraces
    ];

    return allTraces.filter(trace => {
      if (criteria.status && trace.status !== criteria.status) {
        return false;
      }

      if (criteria.minDuration && (!trace.duration || trace.duration < criteria.minDuration)) {
        return false;
      }

      if (criteria.maxDuration && (!trace.duration || trace.duration > criteria.maxDuration)) {
        return false;
      }

      if (criteria.startTime && trace.startTime < criteria.startTime) {
        return false;
      }

      if (criteria.endTime && (!trace.endTime || trace.endTime > criteria.endTime)) {
        return false;
      }

      if (criteria.hasError !== undefined) {
        const hasError = Array.from(trace.spans.values()).some(span => span.status === 'error');
        if (criteria.hasError !== hasError) {
          return false;
        }
      }

      if (criteria.contentType && trace.metadata.contentType !== criteria.contentType) {
        return false;
      }

      if (criteria.userId && trace.metadata.userId !== criteria.userId) {
        return false;
      }

      if (criteria.operationName) {
        const rootSpan = trace.spans.get(trace.rootSpanId);
        if (!rootSpan || !rootSpan.operationName.includes(criteria.operationName)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get trace statistics
   */
  getTraceStats(): {
    activeTraces: number;
    completedTraces: number;
    averageDuration: number;
    errorRate: number;
    slowTraces: Array<{ traceId: string; duration: number; operationName: string }>;
  } {
    const allTraces = [
      ...Array.from(this.activeTraces.values()),
      ...this.completedTraces
    ];

    const completedTracesWithDuration = allTraces.filter(t => t.duration !== undefined);
    const totalDuration = completedTracesWithDuration.reduce((sum, t) => sum + (t.duration || 0), 0);
    const averageDuration = completedTracesWithDuration.length > 0 
      ? totalDuration / completedTracesWithDuration.length 
      : 0;

    const errorTraces = allTraces.filter(t => t.status === 'failed');
    const errorRate = allTraces.length > 0 ? errorTraces.length / allTraces.length : 0;

    const slowTraces = completedTracesWithDuration
      .filter(t => (t.duration || 0) > averageDuration * 2)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10)
      .map(t => ({
        traceId: t.traceId,
        duration: t.duration || 0,
        operationName: t.spans.get(t.rootSpanId)?.operationName || 'unknown'
      }));

    return {
      activeTraces: this.activeTraces.size,
      completedTraces: this.completedTraces.length,
      averageDuration,
      errorRate,
      slowTraces
    };
  }

  /**
   * Create log context from trace context
   */
  createLogContext(traceContext: TraceContext): Partial<LogContext> {
    if (!traceContext.traceId) {
      return {};
    }

    return {
      requestId: traceContext.traceId,
      operationId: traceContext.spanId
    };
  }

  /**
   * Extract trace context from log context
   */
  extractTraceContext(logContext: LogContext): TraceContext | null {
    if (!logContext.requestId) {
      return null;
    }

    return {
      traceId: logContext.requestId,
      spanId: logContext.operationId || this.generateSpanId(),
      baggage: {}
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TracerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Finish a trace
   */
  private finishTrace(trace: RequestTrace): void {
    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
    
    // Determine trace status
    const hasErrors = Array.from(trace.spans.values()).some(span => span.status === 'error');
    trace.status = hasErrors ? 'failed' : 'completed';

    // Move to completed traces
    this.activeTraces.delete(trace.traceId);
    this.completedTraces.push(trace);

    // Limit completed traces
    if (this.completedTraces.length > this.maxCompletedTraces) {
      this.completedTraces = this.completedTraces.slice(-this.maxCompletedTraces);
    }
  }

  /**
   * Check if request should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return uuidv4().replace(/-/g, '');
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return uuidv4().slice(0, 16).replace(/-/g, '');
  }

  /**
   * Create no-op context for disabled tracing
   */
  private createNoOpContext(): TraceContext {
    return {
      traceId: '',
      spanId: '',
      baggage: {}
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldTraces();
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Clean up old traces
   */
  private cleanupOldTraces(): void {
    const cutoffTime = Date.now() - this.config.maxTraceAge;

    // Clean up active traces that are too old
    for (const [traceId, trace] of this.activeTraces.entries()) {
      if (trace.startTime.getTime() < cutoffTime) {
        trace.status = 'failed';
        trace.endTime = new Date();
        trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
        
        this.activeTraces.delete(traceId);
        this.completedTraces.push(trace);
      }
    }

    // Clean up old completed traces
    this.completedTraces = this.completedTraces.filter(
      trace => (trace.endTime?.getTime() || 0) > cutoffTime
    );
  }
}

/**
 * Global tracer instance
 */
let globalTracer: RequestTracer | null = null;

/**
 * Get or create global tracer
 */
export function getTracer(config?: Partial<TracerConfig>): RequestTracer {
  if (!globalTracer) {
    globalTracer = new RequestTracer(config);
  }
  return globalTracer;
}

/**
 * Set global tracer
 */
export function setTracer(tracer: RequestTracer): void {
  globalTracer = tracer;
}

export default RequestTracer;