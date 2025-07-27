/**
 * Validation Result Formatter
 * 
 * Formats validation results for different output contexts including API responses,
 * admin panel display, and logging. Provides context-aware formatting and error aggregation.
 */

import { FormattedValidationResult, FormattedValidationError, FormattedValidationWarning } from './ValidationResultHandler';

/**
 * API response format for validation results
 */
interface ApiValidationResponse {
  success: boolean;
  canProceed: boolean;
  data?: any;
  errors?: ApiValidationError[];
  warnings?: ApiValidationWarning[];
  meta: {
    validationTime: number;
    rulesExecuted: number;
    timestamp: string;
  };
}

/**
 * API validation error format
 */
interface ApiValidationError {
  field?: string;
  code: string;
  message: string;
  type: 'critical' | 'warning';
  suggestions?: string[];
}

/**
 * API validation warning format
 */
interface ApiValidationWarning {
  field?: string;
  code: string;
  message: string;
  suggestions?: string[];
}

/**
 * Admin panel format for validation results
 */
interface AdminValidationDisplay {
  status: 'success' | 'warning' | 'error';
  title: string;
  summary: string;
  details: AdminValidationDetail[];
  actions?: AdminValidationAction[];
}

/**
 * Admin validation detail
 */
interface AdminValidationDetail {
  type: 'error' | 'warning' | 'info';
  icon: string;
  title: string;
  message: string;
  field?: string;
  suggestions?: string[];
  expandable?: boolean;
  details?: string;
}

/**
 * Admin validation action
 */
interface AdminValidationAction {
  label: string;
  action: string;
  type: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

/**
 * Log format for validation results
 */
interface LogValidationEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  context: {
    contentType: string;
    operation: string;
    operationId: string;
    validationSummary: {
      isValid: boolean;
      canProceed: boolean;
      errorCount: number;
      warningCount: number;
      executionTime: number;
    };
    errors?: LogValidationError[];
    warnings?: LogValidationWarning[];
  };
  timestamp: string;
}

/**
 * Log validation error
 */
interface LogValidationError {
  rule: string;
  code: string;
  message: string;
  field?: string;
  type: 'critical' | 'warning';
}

/**
 * Log validation warning
 */
interface LogValidationWarning {
  rule: string;
  code: string;
  message: string;
  field?: string;
}

/**
 * Validation Result Formatter Class
 */
export class ValidationResultFormatter {
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  /**
   * Format validation result for API response
   */
  formatForApi(
    result: FormattedValidationResult,
    data?: any,
    language: string = 'de'
  ): ApiValidationResponse {
    const errors = result.errors.map(error => this.formatErrorForApi(error, language));
    const warnings = result.warnings.map(warning => this.formatWarningForApi(warning, language));

    return {
      success: result.isValid,
      canProceed: result.canProceed,
      data: result.canProceed ? data : undefined,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      meta: {
        validationTime: result.summary.executionTime,
        rulesExecuted: result.summary.rulesExecuted,
        timestamp: result.metadata.timestamp.toISOString()
      }
    };
  }

  /**
   * Format validation result for admin panel display
   */
  formatForAdmin(
    result: FormattedValidationResult,
    language: string = 'de'
  ): AdminValidationDisplay {
    const status = this.determineAdminStatus(result);
    const title = this.generateAdminTitle(result, language);
    const summary = this.generateAdminSummary(result, language);
    const details = this.generateAdminDetails(result, language);
    const actions = this.generateAdminActions(result, language);

    return {
      status,
      title,
      summary,
      details,
      actions
    };
  }

  /**
   * Format validation result for logging
   */
  formatForLog(result: FormattedValidationResult): LogValidationEntry {
    const level = this.determineLogLevel(result);
    const message = this.generateLogMessage(result);
    
    const errors = result.errors.map(error => ({
      rule: error.ruleName,
      code: error.code,
      message: error.message.de,
      field: error.field,
      type: error.type
    }));

    const warnings = result.warnings.map(warning => ({
      rule: warning.ruleName,
      code: warning.code,
      message: warning.message.de,
      field: warning.field
    }));

    return {
      level,
      message,
      context: {
        contentType: result.metadata.contentType,
        operation: result.metadata.operation,
        operationId: result.metadata.operationId,
        validationSummary: {
          isValid: result.isValid,
          canProceed: result.canProceed,
          errorCount: result.summary.totalErrors,
          warningCount: result.summary.warnings,
          executionTime: result.summary.executionTime
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      },
      timestamp: result.metadata.timestamp.toISOString()
    };
  }

  /**
   * Format validation result for Strapi error response
   */
  formatForStrapiError(result: FormattedValidationResult): Error {
    if (result.canProceed) {
      // Create a warning that doesn't block the operation
      const warningMessage = this.generateWarningMessage(result);
      const warning = new Error(warningMessage);
      (warning as any).isWarning = true;
      return warning;
    }

    // Create a blocking error
    const errorMessage = this.generateErrorMessage(result);
    const error = new Error(errorMessage);
    (error as any).validationResult = result;
    return error;
  }

  /**
   * Format single error for API
   */
  private formatErrorForApi(error: FormattedValidationError, language: string): ApiValidationError {
    return {
      field: error.field,
      code: error.code,
      message: this.getLocalizedMessage(error.message, language),
      type: error.type,
      suggestions: error.suggestions
    };
  }

  /**
   * Format single warning for API
   */
  private formatWarningForApi(warning: FormattedValidationWarning, language: string): ApiValidationWarning {
    return {
      field: warning.field,
      code: warning.code,
      message: this.getLocalizedMessage(warning.message, language),
      suggestions: warning.suggestions
    };
  }

  /**
   * Determine admin panel status
   */
  private determineAdminStatus(result: FormattedValidationResult): 'success' | 'warning' | 'error' {
    if (!result.canProceed) return 'error';
    if (result.summary.warnings > 0) return 'warning';
    return 'success';
  }

  /**
   * Generate admin panel title
   */
  private generateAdminTitle(result: FormattedValidationResult, language: string): string {
    if (!result.canProceed) {
      return 'Validierung fehlgeschlagen';
    }
    if (result.summary.warnings > 0) {
      return 'Validierung mit Warnungen';
    }
    return 'Validierung erfolgreich';
  }

  /**
   * Generate admin panel summary
   */
  private generateAdminSummary(result: FormattedValidationResult, language: string): string {
    const { totalErrors, criticalErrors, warnings } = result.summary;
    
    if (criticalErrors > 0) {
      return `${criticalErrors} kritische Fehler gefunden. Die Operation wurde blockiert.`;
    }
    
    if (totalErrors > 0 || warnings > 0) {
      const parts = [];
      if (totalErrors > 0) parts.push(`${totalErrors} Fehler`);
      if (warnings > 0) parts.push(`${warnings} Warnungen`);
      return `${parts.join(' und ')} gefunden. Die Operation kann fortgesetzt werden.`;
    }
    
    return 'Alle Validierungen erfolgreich bestanden.';
  }

  /**
   * Generate admin panel details
   */
  private generateAdminDetails(result: FormattedValidationResult, language: string): AdminValidationDetail[] {
    const details: AdminValidationDetail[] = [];

    // Add errors
    for (const error of result.errors) {
      details.push({
        type: 'error',
        icon: error.type === 'critical' ? 'alert-circle' : 'alert-triangle',
        title: error.ruleName,
        message: this.getLocalizedMessage(error.message, language),
        field: error.field,
        suggestions: error.suggestions,
        expandable: !!error.context,
        details: error.context ? JSON.stringify(error.context, null, 2) : undefined
      });
    }

    // Add warnings
    for (const warning of result.warnings) {
      details.push({
        type: 'warning',
        icon: 'alert-triangle',
        title: warning.ruleName,
        message: this.getLocalizedMessage(warning.message, language),
        field: warning.field,
        suggestions: warning.suggestions,
        expandable: !!warning.context,
        details: warning.context ? JSON.stringify(warning.context, null, 2) : undefined
      });
    }

    // Add success info if no errors/warnings
    if (details.length === 0) {
      details.push({
        type: 'info',
        icon: 'check-circle',
        title: 'Validierung erfolgreich',
        message: `Alle ${result.summary.rulesExecuted} Validierungsregeln erfolgreich bestanden.`
      });
    }

    return details;
  }

  /**
   * Generate admin panel actions
   */
  private generateAdminActions(result: FormattedValidationResult, language: string): AdminValidationAction[] {
    const actions: AdminValidationAction[] = [];

    if (!result.canProceed) {
      actions.push({
        label: 'Fehler korrigieren',
        action: 'fix-errors',
        type: 'primary'
      });
      
      actions.push({
        label: 'Abbrechen',
        action: 'cancel',
        type: 'secondary'
      });
    } else if (result.summary.warnings > 0) {
      actions.push({
        label: 'Trotzdem fortfahren',
        action: 'proceed-with-warnings',
        type: 'primary'
      });
      
      actions.push({
        label: 'Warnungen beheben',
        action: 'fix-warnings',
        type: 'secondary'
      });
    } else {
      actions.push({
        label: 'Fortfahren',
        action: 'proceed',
        type: 'primary'
      });
    }

    return actions;
  }

  /**
   * Determine log level based on result
   */
  private determineLogLevel(result: FormattedValidationResult): 'error' | 'warn' | 'info' | 'debug' {
    if (result.summary.criticalErrors > 0) return 'error';
    if (result.summary.totalErrors > 0) return 'warn';
    if (result.summary.warnings > 0) return 'info';
    return 'debug';
  }

  /**
   * Generate log message
   */
  private generateLogMessage(result: FormattedValidationResult): string {
    const { contentType, operation, operationId } = result.metadata;
    const { totalErrors, criticalErrors, warnings, executionTime } = result.summary;

    if (criticalErrors > 0) {
      return `Validation failed for ${contentType} ${operation} (${operationId}): ${criticalErrors} critical errors in ${executionTime}ms`;
    }
    
    if (totalErrors > 0 || warnings > 0) {
      return `Validation completed with issues for ${contentType} ${operation} (${operationId}): ${totalErrors} errors, ${warnings} warnings in ${executionTime}ms`;
    }
    
    return `Validation successful for ${contentType} ${operation} (${operationId}) in ${executionTime}ms`;
  }

  /**
   * Generate error message for Strapi error
   */
  private generateErrorMessage(result: FormattedValidationResult): string {
    const criticalErrors = result.errors.filter(e => e.type === 'critical');
    
    if (criticalErrors.length === 1) {
      return this.getLocalizedMessage(criticalErrors[0].message, 'de');
    }
    
    if (criticalErrors.length > 1) {
      const messages = criticalErrors.map(e => this.getLocalizedMessage(e.message, 'de'));
      return `Mehrere Validierungsfehler:\n${messages.map(m => `• ${m}`).join('\n')}`;
    }
    
    return 'Validierungsfehler aufgetreten';
  }

  /**
   * Generate warning message for Strapi warning
   */
  private generateWarningMessage(result: FormattedValidationResult): string {
    const warningCount = result.summary.warnings;
    const errorCount = result.summary.totalErrors - result.summary.criticalErrors;
    
    const parts = [];
    if (errorCount > 0) parts.push(`${errorCount} Fehler`);
    if (warningCount > 0) parts.push(`${warningCount} Warnungen`);
    
    return `Validierung mit ${parts.join(' und ')}: Operation wird fortgesetzt`;
  }

  /**
   * Get localized message from message object
   */
  private getLocalizedMessage(message: any, language: string): string {
    if (typeof message === 'string') return message;
    if (message[language]) return message[language];
    if (message.de) return message.de;
    if (message.en) return message.en;
    return 'Unbekannter Validierungsfehler';
  }

  /**
   * Create summary statistics for validation results
   */
  createSummaryStatistics(results: FormattedValidationResult[]): {
    totalValidations: number;
    successfulValidations: number;
    validationsWithWarnings: number;
    failedValidations: number;
    averageExecutionTime: number;
    mostCommonErrors: Array<{ code: string; count: number }>;
    mostCommonWarnings: Array<{ code: string; count: number }>;
  } {
    const stats = {
      totalValidations: results.length,
      successfulValidations: 0,
      validationsWithWarnings: 0,
      failedValidations: 0,
      averageExecutionTime: 0,
      mostCommonErrors: [] as Array<{ code: string; count: number }>,
      mostCommonWarnings: [] as Array<{ code: string; count: number }>
    };

    const errorCounts = new Map<string, number>();
    const warningCounts = new Map<string, number>();
    let totalExecutionTime = 0;

    for (const result of results) {
      totalExecutionTime += result.summary.executionTime;

      if (!result.canProceed) {
        stats.failedValidations++;
      } else if (result.summary.warnings > 0) {
        stats.validationsWithWarnings++;
      } else {
        stats.successfulValidations++;
      }

      // Count error codes
      for (const error of result.errors) {
        errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + 1);
      }

      // Count warning codes
      for (const warning of result.warnings) {
        warningCounts.set(warning.code, (warningCounts.get(warning.code) || 0) + 1);
      }
    }

    stats.averageExecutionTime = results.length > 0 ? totalExecutionTime / results.length : 0;

    // Sort and get top errors/warnings
    stats.mostCommonErrors = Array.from(errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    stats.mostCommonWarnings = Array.from(warningCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }
}

export default ValidationResultFormatter;
export type {
  ApiValidationResponse,
  ApiValidationError,
  ApiValidationWarning,
  AdminValidationDisplay,
  AdminValidationDetail,
  AdminValidationAction,
  LogValidationEntry,
  LogValidationError,
  LogValidationWarning
};