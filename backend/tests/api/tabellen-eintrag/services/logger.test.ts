/**
 * Unit Tests for Comprehensive Logging System
 */

import { 
  AutomationLoggerImpl, 
  CalculationLogContext, 
  CalculationResult,
  JobLogContext,
  JobMetrics,
  ResourceUsage,
  LogLevel,
  AlertLevel,
  HealthStatus,
  AuditLogFilters
} from '../../../../src/api/tabellen-eintrag/services/logger';
import { 
  AutomationError, 
  AutomationErrorType, 
  ErrorSeverity, 
  ERROR_CODES,
  AuditLogEntry,
  AuditAction
} from '../../../../src/api/tabellen-eintrag/services/error-handling';

// Mock Strapi
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    debug: jest.fn()
  }
};

global.strapi = mockStrapi as any;

describe('AutomationLoggerImpl', () => {
  let logger: AutomationLoggerImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new AutomationLoggerImpl();
  });

  afterEach(() => {
    logger.destroy();
  });

  describe('Calculation Logging', () => {
    const mockCalculationContext: CalculationLogContext = {
      ligaId: 1,
      saisonId: 2023,
      trigger: 'manual',
      userId: 'user123',
      requestId: 'req456',
      jobId: 'job789',
      timestamp: new Date(),
      metadata: { testData: 'test' }
    };

    it('should log calculation start', () => {
      logger.logCalculationStart(mockCalculationContext);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting table calculation'),
        expect.objectContaining({
          operation: 'calculation_start',
          ligaId: 1,
          saisonId: 2023,
          trigger: 'manual',
          userId: 'user123'
        })
      );
    });

    it('should log successful calculation end', () => {
      const result: CalculationResult = {
        success: true,
        duration: 1500,
        teamsProcessed: 16,
        entriesUpdated: 16,
        warnings: ['Minor warning'],
        metadata: { additionalInfo: 'test' }
      };

      logger.logCalculationEnd(mockCalculationContext, result);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('completed successfully in 1500ms'),
        expect.objectContaining({
          operation: 'calculation_end',
          success: true,
          duration: 1500,
          teamsProcessed: 16,
          entriesUpdated: 16
        })
      );
    });

    it('should log failed calculation end', () => {
      const result: CalculationResult = {
        success: false,
        duration: 2500,
        teamsProcessed: 0,
        entriesUpdated: 0
      };

      logger.logCalculationEnd(mockCalculationContext, result);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('failed after 2500ms'),
        expect.objectContaining({
          operation: 'calculation_end',
          success: false,
          duration: 2500
        })
      );
    });

    it('should log calculation errors', () => {
      const error: AutomationError = {
        type: AutomationErrorType.CALCULATION_ERROR,
        code: ERROR_CODES.DATA_INCONSISTENCY,
        message: 'Data inconsistency detected',
        details: { teamId: 5 },
        timestamp: new Date(),
        context: {
          operation: 'calculate-table',
          ligaId: 1,
          saisonId: 2023,
          timestamp: new Date()
        },
        retryable: false,
        severity: ErrorSeverity.HIGH
      };

      logger.logCalculationError(mockCalculationContext, error);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Table calculation error'),
        expect.objectContaining({
          operation: 'calculation_error',
          errorType: AutomationErrorType.CALCULATION_ERROR,
          errorCode: ERROR_CODES.DATA_INCONSISTENCY,
          errorSeverity: ErrorSeverity.HIGH
        })
      );
    });

    it('should retrieve calculation logs', async () => {
      // Log some calculations first
      logger.logCalculationStart(mockCalculationContext);
      
      const result: CalculationResult = {
        success: true,
        duration: 1000,
        teamsProcessed: 16,
        entriesUpdated: 16
      };
      logger.logCalculationEnd(mockCalculationContext, result);

      const logs = await logger.getCalculationLogs(1, 2023, 10);

      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        ligaId: 1,
        saisonId: 2023,
        operation: 'calculation_start'
      });
      expect(logs[1]).toMatchObject({
        ligaId: 1,
        saisonId: 2023,
        operation: 'calculation_end',
        success: true
      });
    });
  });

  describe('Job Logging', () => {
    const mockJobContext: JobLogContext = {
      jobId: 'job123',
      ligaId: 1,
      saisonId: 2023,
      priority: 'NORMAL',
      trigger: 'automatic',
      timestamp: new Date(),
      metadata: { queueSize: 5 }
    };

    it('should log job queued', () => {
      logger.logJobQueued(mockJobContext);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Job queued: job123'),
        expect.objectContaining({
          operation: 'job_queued',
          jobId: 'job123',
          priority: 'NORMAL'
        })
      );
    });

    it('should log job started', () => {
      logger.logJobStarted(mockJobContext);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Job started: job123'),
        expect.objectContaining({
          operation: 'job_started',
          jobId: 'job123'
        })
      );
    });

    it('should log job completed with metrics', () => {
      const metrics: JobMetrics = {
        duration: 2000,
        memoryUsage: 50 * 1024 * 1024, // 50MB
        cpuUsage: 25,
        retryCount: 0,
        timeoutCount: 0
      };

      logger.logJobCompleted(mockJobContext, metrics);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Job completed: job123 in 2000ms'),
        expect.objectContaining({
          operation: 'job_completed',
          duration: 2000,
          memoryUsage: 50 * 1024 * 1024
        })
      );
    });

    it('should log job failed', () => {
      const error: AutomationError = {
        type: AutomationErrorType.TIMEOUT_ERROR,
        code: ERROR_CODES.JOB_TIMEOUT,
        message: 'Job timed out',
        details: {},
        timestamp: new Date(),
        context: {
          operation: 'job-processing',
          jobId: 'job123',
          timestamp: new Date()
        },
        retryable: true,
        severity: ErrorSeverity.MEDIUM
      };

      logger.logJobFailed(mockJobContext, error);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Job failed: job123'),
        expect.objectContaining({
          operation: 'job_failed',
          errorType: AutomationErrorType.TIMEOUT_ERROR
        })
      );
    });

    it('should log job retry', () => {
      const nextRetryAt = new Date(Date.now() + 5000);
      
      logger.logJobRetry(mockJobContext, 2, nextRetryAt);

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Job retry scheduled: job123 (attempt 2)'),
        expect.objectContaining({
          operation: 'job_retry',
          retryCount: 2,
          nextRetryAt
        })
      );
    });

    it('should retrieve job logs', async () => {
      logger.logJobQueued(mockJobContext);
      logger.logJobStarted(mockJobContext);

      const logs = await logger.getJobLogs('job123');

      expect(logs).toHaveLength(2);
      expect(logs[0].operation).toBe('job_queued');
      expect(logs[1].operation).toBe('job_started');
      expect(logs.every(log => log.jobId === 'job123')).toBe(true);
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metrics', () => {
      const metrics = {
        operationName: 'table_calculation',
        duration: 1500,
        memoryUsage: 100 * 1024 * 1024, // 100MB
        cpuUsage: 45,
        timestamp: new Date(),
        metadata: { teamsProcessed: 16 }
      };

      logger.logPerformanceMetrics(metrics);

      // Should log as warning because it exceeds memory threshold
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Performance: table_calculation took 1500ms'),
        expect.objectContaining({
          operation: 'performance_metrics',
          duration: 1500,
          memoryUsage: 100 * 1024 * 1024
        })
      );
    });

    it('should log slow operations', () => {
      logger.logSlowOperation('slow_query', 8000, 5000, { queryType: 'complex' });

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected'),
        expect.objectContaining({
          operation: 'alert',
          alertLevel: AlertLevel.MEDIUM
        })
      );
    });

    it('should log resource usage', () => {
      const usage: ResourceUsage = {
        timestamp: new Date(),
        memoryUsage: {
          used: 200 * 1024 * 1024, // 200MB
          total: 1024 * 1024 * 1024, // 1GB
          percentage: 20
        },
        cpuUsage: {
          percentage: 30,
          loadAverage: [1.5, 1.2, 1.0]
        },
        databaseConnections: {
          active: 5,
          idle: 10,
          total: 15
        }
      };

      logger.logResourceUsage(usage);

      // Should not trigger alert since usage is below 80%
      expect(mockStrapi.log.warn).not.toHaveBeenCalled();
    });

    it('should alert on high resource usage', () => {
      const usage: ResourceUsage = {
        timestamp: new Date(),
        memoryUsage: {
          used: 850 * 1024 * 1024, // 850MB
          total: 1024 * 1024 * 1024, // 1GB
          percentage: 85
        },
        cpuUsage: {
          percentage: 90,
          loadAverage: [3.0, 2.8, 2.5]
        }
      };

      logger.logResourceUsage(usage);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('High resource usage detected'),
        expect.objectContaining({
          alertLevel: AlertLevel.HIGH
        })
      );
    });

    it('should retrieve performance logs', async () => {
      const timeRange = {
        from: new Date(Date.now() - 3600000), // 1 hour ago
        to: new Date()
      };

      // Log some performance metrics first
      logger.logPerformanceMetrics({
        operationName: 'test_operation',
        duration: 1000,
        memoryUsage: 50 * 1024 * 1024,
        cpuUsage: 25,
        timestamp: new Date(),
        metadata: {}
      });

      const logs = await logger.getPerformanceLogs(timeRange);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        operation: 'test_operation',
        duration: 1000
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log audit events', () => {
      const auditEntry: AuditLogEntry = {
        id: 'audit123',
        userId: 'user456',
        action: AuditAction.UPDATE,
        entityType: 'tabellen-eintrag',
        entityId: '789',
        oldValues: { punkte: 10 },
        newValues: { punkte: 13 },
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        metadata: { source: 'admin_panel' }
      };

      logger.logAuditEvent(auditEntry);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: UPDATE on tabellen-eintrag:789'),
        expect.objectContaining({
          operation: 'audit_event',
          userId: 'user456',
          action: AuditAction.UPDATE,
          entityType: 'tabellen-eintrag'
        })
      );
    });

    it('should log user actions', () => {
      logger.logUserAction('user123', 'CALCULATE', {
        entityType: 'tabelle',
        entityId: 'liga1_saison2023',
        ipAddress: '10.0.0.1',
        metadata: { trigger: 'manual' }
      });

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: CALCULATE on tabelle:liga1_saison2023'),
        expect.objectContaining({
          operation: 'audit_event',
          userId: 'user123',
          action: 'CALCULATE'
        })
      );
    });

    it('should log system actions', () => {
      logger.logSystemAction('SNAPSHOT', {
        entityType: 'tabelle',
        entityId: 'liga1_saison2023',
        metadata: { automatic: true }
      });

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: SNAPSHOT on tabelle:liga1_saison2023'),
        expect.objectContaining({
          operation: 'audit_event',
          userId: 'system',
          action: 'SNAPSHOT'
        })
      );
    });

    it('should retrieve audit logs with filters', async () => {
      // Log some audit events first
      logger.logUserAction('user123', 'UPDATE', {
        entityType: 'spiel',
        entityId: 'game456'
      });
      
      logger.logUserAction('user456', 'CREATE', {
        entityType: 'team',
        entityId: 'team789'
      });

      const filters: AuditLogFilters = {
        userId: 'user123',
        action: AuditAction.UPDATE,
        limit: 10
      };

      const logs = await logger.getAuditLogs(filters);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userId: 'user123',
        action: 'UPDATE',
        entityType: 'spiel'
      });
    });

    it('should filter audit logs by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      logger.logUserAction('user123', 'DELETE', {
        entityType: 'spiel',
        entityId: 'game123'
      });

      const filters: AuditLogFilters = {
        dateFrom: yesterday,
        dateTo: tomorrow
      };

      const logs = await logger.getAuditLogs(filters);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every(log => 
        log.timestamp >= yesterday && log.timestamp <= tomorrow
      )).toBe(true);
    });
  });

  describe('Alert and Monitoring', () => {
    it('should log alerts with different levels', () => {
      const testCases = [
        { level: AlertLevel.CRITICAL, expectedLogMethod: 'fatal' },
        { level: AlertLevel.HIGH, expectedLogMethod: 'error' },
        { level: AlertLevel.MEDIUM, expectedLogMethod: 'warn' },
        { level: AlertLevel.LOW, expectedLogMethod: 'info' }
      ];

      testCases.forEach(({ level, expectedLogMethod }) => {
        jest.clearAllMocks();
        
        logger.logAlert(level, `Test ${level} alert`, { testData: 'test' });

        expect(mockStrapi.log[expectedLogMethod]).toHaveBeenCalledWith(
          expect.stringContaining(`Test ${level} alert`),
          expect.objectContaining({
            operation: 'alert',
            alertLevel: level
          })
        );
      });
    });

    it('should log health checks', () => {
      logger.logHealthCheck('database', HealthStatus.HEALTHY, {
        responseTime: 50,
        connections: 10
      });

      // Healthy status should not log to Strapi (only debug level)
      expect(mockStrapi.log.info).not.toHaveBeenCalled();
      expect(mockStrapi.log.warn).not.toHaveBeenCalled();
      expect(mockStrapi.log.error).not.toHaveBeenCalled();
    });

    it('should log degraded health checks', () => {
      logger.logHealthCheck('queue', HealthStatus.DEGRADED, {
        pendingJobs: 75,
        processingJobs: 5
      });

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Health check: queue is degraded'),
        expect.objectContaining({
          operation: 'health_check',
          component: 'queue',
          status: HealthStatus.DEGRADED
        })
      );
    });

    it('should log unhealthy health checks', () => {
      logger.logHealthCheck('memory', HealthStatus.UNHEALTHY, {
        usagePercentage: 95,
        availableMB: 50
      });

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Health check: memory is unhealthy'),
        expect.objectContaining({
          operation: 'health_check',
          component: 'memory',
          status: HealthStatus.UNHEALTHY
        })
      );
    });

    it('should retrieve alert logs', async () => {
      logger.logAlert(AlertLevel.HIGH, 'Test high alert');
      logger.logAlert(AlertLevel.MEDIUM, 'Test medium alert');

      const allAlerts = await logger.getAlertLogs();
      expect(allAlerts).toHaveLength(2);

      const highAlerts = await logger.getAlertLogs(AlertLevel.HIGH);
      expect(highAlerts).toHaveLength(1);
      expect(highAlerts[0].level).toBe(AlertLevel.HIGH);
    });

    it('should filter alert logs by time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneHourFromNow = new Date(now.getTime() + 3600000);

      logger.logAlert(AlertLevel.MEDIUM, 'Recent alert');

      const alerts = await logger.getAlertLogs(undefined, {
        from: oneHourAgo,
        to: oneHourFromNow
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Log Buffer Management', () => {
    it('should limit log buffer size', () => {
      // Create a logger and add many entries
      const testLogger = new AutomationLoggerImpl();
      
      // Add more than 1000 entries
      for (let i = 0; i < 1200; i++) {
        testLogger.logAlert(AlertLevel.LOW, `Test alert ${i}`);
      }

      // Buffer should be limited to 1000 entries
      const alerts = testLogger.getAlertLogs();
      expect(alerts.length).toBeLessThanOrEqual(1000);
      
      testLogger.destroy();
    });

    it('should handle concurrent logging', async () => {
      const promises = [];
      
      // Create multiple concurrent logging operations
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            logger.logAlert(AlertLevel.LOW, `Concurrent alert ${i}`);
          })
        );
      }

      await Promise.all(promises);

      const alerts = await logger.getAlertLogs();
      expect(alerts.length).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle logging errors gracefully', () => {
      // Mock Strapi log to throw an error
      mockStrapi.log.info.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      // Should not throw an error
      expect(() => {
        logger.logAlert(AlertLevel.LOW, 'Test alert');
      }).not.toThrow();
    });

    it('should handle invalid data gracefully', () => {
      expect(() => {
        logger.logPerformanceMetrics({
          operationName: '',
          duration: -1,
          memoryUsage: NaN,
          cpuUsage: undefined as any,
          timestamp: new Date(),
          metadata: null as any
        });
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const testLogger = new AutomationLoggerImpl();
      
      // Add some data
      testLogger.logAlert(AlertLevel.LOW, 'Test alert');
      
      // Destroy should clear buffers
      testLogger.destroy();
      
      // Should not be able to retrieve logs after destroy
      const alerts = testLogger.getAlertLogs();
      expect(alerts).toHaveLength(0);
    });
  });
});