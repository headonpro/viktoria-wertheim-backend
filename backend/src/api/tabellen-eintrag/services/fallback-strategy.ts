/**
 * Fallback Strategy Implementation
 * Provides graceful degradation strategies for different error scenarios
 */

import { FallbackStrategy, ErrorContext } from './error-handling';

export class DefaultFallbackStrategy implements FallbackStrategy {
  
  async onCalculationFailure(context: ErrorContext): Promise<any> {
    strapi.log.warn('Calculation failure fallback triggered', { context });

    try {
      // Try to restore from latest snapshot
      const snapshotService = strapi.service('api::tabellen-eintrag.snapshot');
      
      if (context.ligaId && context.saisonId) {
        const snapshots = await snapshotService.listSnapshots(context.ligaId, context.saisonId);
        
        if (snapshots.length > 0) {
          const latestSnapshot = snapshots[0]; // Assuming sorted by date desc
          strapi.log.info('Restoring from snapshot due to calculation failure', {
            snapshotId: latestSnapshot.id,
            ligaId: context.ligaId,
            saisonId: context.saisonId
          });
          
          await snapshotService.restoreSnapshot(latestSnapshot.id);
          
          // Return the restored data
          const tabellenService = strapi.service('api::tabellen-eintrag.tabellen-berechnung');
          return await tabellenService.getTableForLiga(context.ligaId, context.saisonId);
        }
      }

      // If no snapshot available, return empty table structure
      return this.getEmptyTableStructure(context);
      
    } catch (fallbackError) {
      strapi.log.error('Fallback strategy failed for calculation failure', {
        context,
        error: fallbackError.message
      });
      
      // Last resort: return empty structure
      return this.getEmptyTableStructure(context);
    }
  }

  async onQueueOverload(context: ErrorContext): Promise<void> {
    strapi.log.warn('Queue overload fallback triggered', { context });

    try {
      const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
      
      // Pause the queue temporarily
      await queueManager.pauseQueue();
      
      // Clear low priority jobs
      await queueManager.clearLowPriorityJobs();
      
      // Set up automatic resume after cooldown period
      setTimeout(async () => {
        try {
          await queueManager.resumeQueue();
          strapi.log.info('Queue resumed after overload cooldown');
        } catch (resumeError) {
          strapi.log.error('Failed to resume queue after overload', {
            error: resumeError.message
          });
        }
      }, 30000); // 30 second cooldown
      
      // Notify administrators
      await this.notifyAdministrators('Queue Overload', 
        'The calculation queue has been temporarily paused due to overload. It will resume automatically in 30 seconds.');
      
    } catch (fallbackError) {
      strapi.log.error('Fallback strategy failed for queue overload', {
        context,
        error: fallbackError.message
      });
    }
  }

  async onDatabaseUnavailable(context: ErrorContext): Promise<void> {
    strapi.log.error('Database unavailable fallback triggered', { context });

    try {
      // Enable read-only mode
      await this.enableReadOnlyMode();
      
      // Cache current state if possible
      await this.cacheCurrentState(context);
      
      // Set up database health monitoring
      this.startDatabaseHealthMonitoring();
      
      // Notify administrators immediately
      await this.notifyAdministrators('Database Unavailable', 
        'The database connection has been lost. The system is now in read-only mode. Please check database connectivity.');
      
    } catch (fallbackError) {
      strapi.log.error('Critical: Fallback strategy failed for database unavailability', {
        context,
        error: fallbackError.message
      });
    }
  }

  async onValidationFailure(context: ErrorContext): Promise<any> {
    strapi.log.warn('Validation failure fallback triggered', { context });

    try {
      // Return the last known good state
      if (context.ligaId && context.saisonId) {
        const tabellenService = strapi.service('api::tabellen-eintrag.tabellen-berechnung');
        
        // Try to get cached table data
        const cachedData = await this.getCachedTableData(context.ligaId, context.saisonId);
        if (cachedData) {
          strapi.log.info('Returning cached table data due to validation failure');
          return cachedData;
        }
        
        // If no cache, try to get current database state (might be stale but valid)
        try {
          return await tabellenService.getTableForLiga(context.ligaId, context.saisonId);
        } catch (dbError) {
          strapi.log.warn('Could not retrieve current table state', { error: dbError.message });
        }
      }

      // Last resort: return empty structure
      return this.getEmptyTableStructure(context);
      
    } catch (fallbackError) {
      strapi.log.error('Fallback strategy failed for validation failure', {
        context,
        error: fallbackError.message
      });
      
      return this.getEmptyTableStructure(context);
    }
  }

  // Helper methods
  private getEmptyTableStructure(context: ErrorContext): any {
    return {
      ligaId: context.ligaId,
      saisonId: context.saisonId,
      entries: [],
      lastUpdated: new Date(),
      status: 'fallback',
      message: 'Table data temporarily unavailable'
    };
  }

  private async enableReadOnlyMode(): Promise<void> {
    try {
      // Set a global flag or configuration to indicate read-only mode
      // This would be checked by controllers to prevent write operations
      // Set a global flag to indicate read-only mode
      (global as any).__readOnlyMode = true;
      
      strapi.log.info('Read-only mode enabled');
    } catch (error) {
      strapi.log.error('Failed to enable read-only mode', { error: error.message });
    }
  }

  private async disableReadOnlyMode(): Promise<void> {
    try {
      // Clear the global read-only flag
      (global as any).__readOnlyMode = false;
      
      strapi.log.info('Read-only mode disabled');
    } catch (error) {
      strapi.log.error('Failed to disable read-only mode', { error: error.message });
    }
  }

  private async cacheCurrentState(context: ErrorContext): Promise<void> {
    try {
      if (context.ligaId && context.saisonId) {
        // Try to cache the current table state before database becomes completely unavailable
        const tabellenService = strapi.service('api::tabellen-eintrag.tabellen-berechnung');
        const currentTable = await tabellenService.getTableForLiga(context.ligaId, context.saisonId);
        
        // Store in memory cache or file system
        await this.setCachedTableData(context.ligaId, context.saisonId, currentTable);
        
        strapi.log.info('Current table state cached successfully', {
          ligaId: context.ligaId,
          saisonId: context.saisonId
        });
      }
    } catch (error) {
      strapi.log.warn('Failed to cache current state', { error: error.message });
    }
  }

  private startDatabaseHealthMonitoring(): void {
    // Start periodic health checks
    const healthCheckInterval = setInterval(async () => {
      try {
        // Simple database connectivity test
        await strapi.db.connection.raw('SELECT 1');
        
        // Database is back online
        strapi.log.info('Database connectivity restored');
        await this.disableReadOnlyMode();
        
        await this.notifyAdministrators('Database Restored', 
          'Database connectivity has been restored. The system is back to normal operation.');
        
        clearInterval(healthCheckInterval);
        
      } catch (error) {
        // Database still unavailable, continue monitoring
        strapi.log.debug('Database still unavailable during health check');
      }
    }, 10000); // Check every 10 seconds

    // Stop monitoring after 10 minutes to prevent infinite loops
    setTimeout(() => {
      clearInterval(healthCheckInterval);
      strapi.log.warn('Database health monitoring stopped after timeout');
    }, 600000); // 10 minutes
  }

  private async getCachedTableData(ligaId: number, saisonId: number): Promise<any> {
    try {
      // In a real implementation, this would use Redis or another cache
      // For now, we'll use a simple in-memory cache
      const cacheKey = `table_${ligaId}_${saisonId}`;
      
      // This is a simplified implementation - in production you'd use proper caching
      if (global.tableCache && global.tableCache[cacheKey]) {
        const cached = global.tableCache[cacheKey];
        
        // Check if cache is not too old (e.g., less than 1 hour)
        const cacheAge = Date.now() - cached.timestamp;
        if (cacheAge < 3600000) { // 1 hour
          return cached.data;
        }
      }
      
      return null;
    } catch (error) {
      strapi.log.warn('Failed to retrieve cached table data', { error: error.message });
      return null;
    }
  }

  private async setCachedTableData(ligaId: number, saisonId: number, data: any): Promise<void> {
    try {
      const cacheKey = `table_${ligaId}_${saisonId}`;
      
      // Initialize global cache if it doesn't exist
      if (!global.tableCache) {
        global.tableCache = {};
      }
      
      global.tableCache[cacheKey] = {
        data,
        timestamp: Date.now()
      };
      
    } catch (error) {
      strapi.log.warn('Failed to cache table data', { error: error.message });
    }
  }

  private async notifyAdministrators(subject: string, message: string): Promise<void> {
    try {
      // In a real implementation, this would send emails, Slack messages, etc.
      // For now, we'll just log the notification
      strapi.log.info('Administrator notification', {
        subject,
        message,
        timestamp: new Date().toISOString()
      });

      // You could integrate with email service, Slack webhook, etc.
      // Example:
      // await strapi.service('api::notification.email').send({
      //   to: 'admin@viktoria-wertheim.de',
      //   subject,
      //   text: message
      // });
      
    } catch (error) {
      strapi.log.error('Failed to notify administrators', { error: error.message });
    }
  }
}

// Export factory function for easy instantiation
export function createDefaultFallbackStrategy(): FallbackStrategy {
  return new DefaultFallbackStrategy();
}