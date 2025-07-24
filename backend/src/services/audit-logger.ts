/**
 * Audit Logger Service
 * Provides comprehensive logging for critical data changes and system events
 */

export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  contentType: string;
  entityId: any;
  operation: 'create' | 'update' | 'delete';
  userId?: any;
  userEmail?: string;
  changes?: Record<string, { from: any; to: any }>;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
}

export class AuditLoggerService {
  private static readonly CRITICAL_CONTENT_TYPES = [
    'api::saison.saison',
    'api::spieler.spieler',

    'api::spielerstatistik.spielerstatistik',
    'api::tabellen-eintrag.tabellen-eintrag'
  ];

  private static readonly CRITICAL_FIELDS = {
    'api::saison.saison': ['aktiv', 'start_datum', 'end_datum'],
    'api::spieler.spieler': ['hauptteam', 'rueckennummer', 'kapitaen', 'status'],

    'api::spielerstatistik.spielerstatistik': ['tore', 'spiele', 'assists', 'gelbe_karten', 'rote_karten'],
    'api::tabellen-eintrag.tabellen-eintrag': ['punkte', 'platz', 'tordifferenz']
  };

  /**
   * Logs a data change event
   */
  static async logDataChange(
    contentType: string,
    entityId: any,
    operation: 'create' | 'update' | 'delete',
    oldData?: any,
    newData?: any,
    userId?: any,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    try {
      const severity = this.determineSeverity(contentType, operation, oldData, newData);
      const changes = this.calculateChanges(oldData, newData);
      const category = this.determineCategory(contentType, operation);
      const description = this.generateDescription(contentType, operation, entityId, changes);

      // Get user information if available
      let userEmail: string | undefined;
      if (userId) {
        try {
          const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
          userEmail = user?.email;
        } catch (error) {
          // User lookup failed, continue without user info
        }
      }

      const logEntry: AuditLogEntry = {
        timestamp: new Date(),
        contentType,
        entityId,
        operation,
        userId,
        userEmail,
        changes,
        metadata: additionalMetadata,
        severity,
        category,
        description
      };

      // Log to Strapi logger
      this.logToStrapi(logEntry);

      // Store in database if critical
      if (severity === 'critical' || severity === 'high') {
        await this.storeAuditLog(logEntry);
      }

      // Send notifications for critical changes
      if (severity === 'critical') {
        await this.sendCriticalChangeNotification(logEntry);
      }

    } catch (error) {
      strapi.log.error('Failed to log audit event:', error);
    }
  }

  /**
   * Logs system events (validation failures, integrity checks, etc.)
   */
  static async logSystemEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        timestamp: new Date(),
        contentType: 'system',
        entityId: null,
        operation: 'create',
        severity,
        category: 'system_event',
        description: `${eventType}: ${description}`,
        metadata
      };

      this.logToStrapi(logEntry);

      if (severity === 'critical' || severity === 'high') {
        await this.storeAuditLog(logEntry);
      }

    } catch (error) {
      strapi.log.error('Failed to log system event:', error);
    }
  }

  /**
   * Logs validation failures
   */
  static async logValidationFailure(
    contentType: string,
    entityId: any,
    validationErrors: string[],
    data?: any,
    userId?: any
  ): Promise<void> {
    await this.logSystemEvent(
      'validation_failure',
      'medium',
      `Validation failed for ${contentType}:${entityId} - ${validationErrors.join(', ')}`,
      {
        contentType,
        entityId,
        validationErrors,
        data,
        userId
      }
    );
  }

  /**
   * Logs data integrity issues
   */
  static async logIntegrityIssue(
    contentType: string,
    entityId: any,
    issueType: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    await this.logSystemEvent(
      'integrity_issue',
      severity,
      `Data integrity issue in ${contentType}:${entityId} - ${issueType}: ${description}`,
      {
        contentType,
        entityId,
        issueType
      }
    );
  }

  /**
   * Logs statistics updates
   */
  static async logStatisticsUpdate(
    playerId: any,
    teamId: any,
    seasonId: any,
    updateType: string,
    oldStats?: any,
    newStats?: any
  ): Promise<void> {
    await this.logDataChange(
      'api::spielerstatistik.spielerstatistik',
      `${playerId}-${teamId}-${seasonId}`,
      'update',
      oldStats,
      newStats,
      undefined,
      {
        updateType,
        playerId,
        teamId,
        seasonId
      }
    );
  }

  /**
   * Retrieves audit logs with filtering
   */
  static async getAuditLogs(filters: {
    contentType?: string;
    entityId?: any;
    operation?: string;
    severity?: string;
    userId?: any;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<AuditLogEntry[]> {
    try {
      // This would typically query a dedicated audit log table
      // For now, we'll return recent logs from memory/file system
      strapi.log.info('Audit log retrieval requested with filters:', filters);
      return [];
    } catch (error) {
      strapi.log.error('Failed to retrieve audit logs:', error);
      return [];
    }
  }

  private static determineSeverity(
    contentType: string,
    operation: 'create' | 'update' | 'delete',
    oldData?: any,
    newData?: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Deletions are always high severity
    if (operation === 'delete') {
      return this.CRITICAL_CONTENT_TYPES.includes(contentType) ? 'critical' : 'high';
    }

    // Check if critical content type
    if (!this.CRITICAL_CONTENT_TYPES.includes(contentType)) {
      return 'low';
    }

    // Check if critical fields were changed
    const criticalFields = this.CRITICAL_FIELDS[contentType] || [];
    const changes = this.calculateChanges(oldData, newData);

    const criticalFieldsChanged = Object.keys(changes).some(field => 
      criticalFields.includes(field)
    );

    if (criticalFieldsChanged) {
      // Special cases for critical changes
      if (contentType === 'api::saison.saison' && changes.aktiv) {
        return 'critical';
      }
      
      // Spiel-specific logic removed since content type was removed

      return 'high';
    }

    return operation === 'create' ? 'medium' : 'low';
  }

  private static calculateChanges(oldData?: any, newData?: any): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    if (!oldData || !newData) {
      return changes;
    }

    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        };
      }
    }

    return changes;
  }

  private static determineCategory(contentType: string, operation: string): string {
    const categoryMap: Record<string, string> = {
      'api::saison.saison': 'season_management',
      'api::spieler.spieler': 'player_management',

      'api::spielerstatistik.spielerstatistik': 'statistics',
      'api::tabellen-eintrag.tabellen-eintrag': 'league_table',
      'api::team.team': 'team_management',
      'api::news-artikel.news-artikel': 'content_management'
    };

    return categoryMap[contentType] || 'general';
  }

  private static generateDescription(
    contentType: string,
    operation: string,
    entityId: any,
    changes: Record<string, { from: any; to: any }>
  ): string {
    const operationText = {
      create: 'erstellt',
      update: 'aktualisiert',
      delete: 'gelöscht'
    };

    const typeText = {
      'api::saison.saison': 'Saison',
      'api::spieler.spieler': 'Spieler',

      'api::spielerstatistik.spielerstatistik': 'Spielerstatistik',
      'api::tabellen-eintrag.tabellen-eintrag': 'Tabelleneintrag',
      'api::team.team': 'Team'
    };

    const type = typeText[contentType] || contentType;
    const op = operationText[operation] || operation;

    let description = `${type} ${entityId} ${op}`;

    if (Object.keys(changes).length > 0) {
      const changedFields = Object.keys(changes).join(', ');
      description += ` (Geänderte Felder: ${changedFields})`;
    }

    return description;
  }

  private static logToStrapi(logEntry: AuditLogEntry): void {
    const logLevel = {
      low: 'info',
      medium: 'info',
      high: 'warn',
      critical: 'error'
    }[logEntry.severity] as 'info' | 'warn' | 'error';

    strapi.log[logLevel](`[AUDIT] ${logEntry.description}`, {
      contentType: logEntry.contentType,
      entityId: logEntry.entityId,
      operation: logEntry.operation,
      userId: logEntry.userId,
      changes: logEntry.changes,
      metadata: logEntry.metadata
    });
  }

  private static async storeAuditLog(logEntry: AuditLogEntry): Promise<void> {
    try {
      // In a real implementation, this would store to a dedicated audit log table
      // For now, we'll just ensure it's logged with high visibility
      strapi.log.warn(`[AUDIT-STORE] ${logEntry.description}`, logEntry);
    } catch (error) {
      strapi.log.error('Failed to store audit log:', error);
    }
  }

  private static async sendCriticalChangeNotification(logEntry: AuditLogEntry): Promise<void> {
    try {
      // In a real implementation, this would send notifications to administrators
      strapi.log.error(`[CRITICAL-CHANGE] ${logEntry.description}`, {
        timestamp: logEntry.timestamp,
        contentType: logEntry.contentType,
        entityId: logEntry.entityId,
        userId: logEntry.userId,
        userEmail: logEntry.userEmail,
        changes: logEntry.changes
      });
    } catch (error) {
      strapi.log.error('Failed to send critical change notification:', error);
    }
  }
}

export default AuditLoggerService;