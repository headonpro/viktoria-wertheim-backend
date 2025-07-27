/**
 * Validation Result Handler
 * 
 * Handles validation results with structured result objects, error message localization,
 * and validation result caching. Provides comprehensive result processing and formatting.
 * 
 * This implements Requirements 2.1 (clear error messages) and 2.3 (structured results).
 */

import { ValidationResult, ValidationError, ValidationWarning } from '../ValidationService';

/**
 * Localized validation message
 */
interface LocalizedMessage {
  de: string;
  en?: string;
  key: string;
  params?: Record<string, any>;
}

/**
 * Formatted validation result
 */
interface FormattedValidationResult {
  isValid: boolean;
  canProceed: boolean;
  summary: {
    totalErrors: number;
    criticalErrors: number;
    warnings: number;
    executionTime: number;
    rulesExecuted: number;
  };
  errors: FormattedValidationError[];
  warnings: FormattedValidationWarning[];
  metadata: {
    timestamp: Date;
    contentType: string;
    operation: string;
    operationId: string;
  };
}

/**
 * Formatted validation error
 */
interface FormattedValidationError {
  ruleName: string;
  type: 'critical' | 'warning';
  code: string;
  message: LocalizedMessage;
  field?: string;
  value?: any;
  suggestions?: string[];
  context?: any;
  timestamp: Date;
}

/**
 * Formatted validation warning
 */
interface FormattedValidationWarning {
  ruleName: string;
  code: string;
  message: LocalizedMessage;
  field?: string;
  value?: any;
  suggestions?: string[];
  context?: any;
  timestamp: Date;
}

/**
 * Result cache entry
 */
interface ResultCacheEntry {
  result: FormattedValidationResult;
  timestamp: Date;
  ttl: number;
  hits: number;
}

/**
 * Message localization configuration
 */
interface LocalizationConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
  messageTemplates: Record<string, Record<string, string>>;
}

/**
 * Default German message templates
 */
const DEFAULT_MESSAGE_TEMPLATES = {
  de: {
    // Common messages
    'REQUIRED_FIELD': 'Das Feld "{field}" ist erforderlich',
    'INVALID_FORMAT': 'Das Format für "{field}" ist ungültig',
    'DUPLICATE_VALUE': 'Der Wert für "{field}" existiert bereits',
    'INVALID_RANGE': 'Der Wert für "{field}" liegt außerhalb des gültigen Bereichs',
    'DEPENDENCY_FAILED': 'Abhängige Validierung für "{field}" fehlgeschlagen',
    'BUSINESS_RULE_VIOLATION': 'Geschäftsregel verletzt: {rule}',
    'DATA_INTEGRITY_ERROR': 'Datenintegrität verletzt für "{field}"',
    
    // Saison specific messages
    'SAISON_DATE_INVALID': 'Das Datum für die Saison ist ungültig',
    'SAISON_DATE_RANGE_INVALID': 'Das Startdatum muss vor dem Enddatum liegen',
    'SAISON_OVERLAP_DETECTED': 'Die Saison überschneidet sich mit bestehenden Saisons: {seasons}',
    'SAISON_ACTIVE_CONSTRAINT': 'Es kann nur eine aktive Saison gleichzeitig geben',
    'SAISON_DELETION_BLOCKED': 'Die Saison kann nicht gelöscht werden: {reason}',
    
    // Team specific messages
    'TEAM_NAME_REQUIRED': 'Der Team-Name ist erforderlich',
    'TEAM_NAME_TOO_SHORT': 'Der Team-Name muss mindestens {minLength} Zeichen lang sein',
    'TEAM_NAME_TOO_LONG': 'Der Team-Name darf maximal {maxLength} Zeichen lang sein',
    'TEAM_DUPLICATE_IN_LEAGUE': 'Ein Team mit diesem Namen existiert bereits in dieser Liga',
    
    // Table entry specific messages
    'TABLE_NUMERIC_INVALID': 'Numerische Felder müssen gültige, nicht-negative Zahlen sein',
    'TABLE_GAME_CONSISTENCY': 'Die Spielstatistiken sind inkonsistent',
    'TABLE_GOAL_STATISTICS': 'Die Tor-Statistiken erscheinen ungewöhnlich',
    'TABLE_POINTS_CALCULATION': 'Die Punktberechnung stimmt nicht überein',
    'TABLE_GOAL_DIFFERENCE': 'Die Tordifferenz-Berechnung ist falsch',
    'TABLE_POSITION_INVALID': 'Die Tabellenposition ist ungültig',
    'TABLE_TEAM_LIGA_MISMATCH': 'Team und Liga sind nicht konsistent',
    
    // System messages
    'VALIDATION_SYSTEM_ERROR': 'Ein Systemfehler ist bei der Validierung aufgetreten',
    'RULE_EXECUTION_ERROR': 'Fehler bei der Ausführung der Validierungsregel: {rule}',
    'TIMEOUT_ERROR': 'Validierung wurde wegen Zeitüberschreitung abgebrochen',
    'DEPENDENCY_ERROR': 'Abhängigkeitsfehler bei Validierungsregel: {rule}'
  },
  en: {
    // English translations (optional)
    'REQUIRED_FIELD': 'The field "{field}" is required',
    'INVALID_FORMAT': 'The format for "{field}" is invalid',
    'DUPLICATE_VALUE': 'The value for "{field}" already exists',
    'VALIDATION_SYSTEM_ERROR': 'A system error occurred during validation'
  }
};

/**
 * Default localization configuration
 */
const DEFAULT_LOCALIZATION_CONFIG: LocalizationConfig = {
  defaultLanguage: 'de',
  supportedLanguages: ['de', 'en'],
  messageTemplates: DEFAULT_MESSAGE_TEMPLATES
};

/**
 * Validation Result Handler Class
 */
export class ValidationResultHandler {
  private strapi: any;
  private localizationConfig: LocalizationConfig;
  private resultCache: Map<string, ResultCacheEntry> = new Map();
  private cacheConfig: {
    enabled: boolean;
    defaultTtl: number;
    maxSize: number;
    cleanupInterval: number;
  };

  constructor(strapi: any, localizationConfig?: Partial<LocalizationConfig>) {
    this.strapi = strapi;
    this.localizationConfig = { ...DEFAULT_LOCALIZATION_CONFIG, ...localizationConfig };
    
    this.cacheConfig = {
      enabled: true,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 10 * 60 * 1000 // 10 minutes
    };
    
    this.initializeCleanupInterval();
    this.logInfo('ValidationResultHandler initialized');
  }

  /**
   * Process and format validation result
   */
  processValidationResult(
    result: ValidationResult,
    contentType: string,
    operation: string,
    operationId: string,
    language: string = 'de'
  ): FormattedValidationResult {
    const cacheKey = this.generateCacheKey(result, contentType, operation, language);
    
    // Check cache first
    if (this.cacheConfig.enabled) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logDebug(`Validation result retrieved from cache: ${operationId}`);
        return cached;
      }
    }

    const formattedResult = this.formatValidationResult(
      result,
      contentType,
      operation,
      operationId,
      language
    );

    // Cache the result
    if (this.cacheConfig.enabled && this.shouldCacheResult(formattedResult)) {
      this.cacheResult(cacheKey, formattedResult);
    }

    return formattedResult;
  }

  /**
   * Format validation result with localized messages
   */
  private formatValidationResult(
    result: ValidationResult,
    contentType: string,
    operation: string,
    operationId: string,
    language: string
  ): FormattedValidationResult {
    const formattedErrors = result.errors.map(error => 
      this.formatValidationError(error, language)
    );

    const formattedWarnings = result.warnings.map(warning => 
      this.formatValidationWarning(warning, language)
    );

    return {
      isValid: result.isValid,
      canProceed: result.canProceed,
      summary: {
        totalErrors: result.errors.length,
        criticalErrors: result.errors.filter(e => e.type === 'critical').length,
        warnings: result.warnings.length,
        executionTime: result.executionTime,
        rulesExecuted: result.rulesExecuted.length
      },
      errors: formattedErrors,
      warnings: formattedWarnings,
      metadata: {
        timestamp: new Date(),
        contentType,
        operation,
        operationId
      }
    };
  }

  /**
   * Format validation error with localization
   */
  private formatValidationError(error: ValidationError, language: string): FormattedValidationError {
    const localizedMessage = this.localizeMessage(error.code, error.message, language, error.context);
    const suggestions = this.generateSuggestions(error);

    return {
      ruleName: error.ruleName,
      type: error.type,
      code: error.code,
      message: localizedMessage,
      field: error.field,
      value: error.value,
      suggestions,
      context: error.context,
      timestamp: error.timestamp
    };
  }

  /**
   * Format validation warning with localization
   */
  private formatValidationWarning(warning: ValidationWarning, language: string): FormattedValidationWarning {
    const localizedMessage = this.localizeMessage(warning.code, warning.message, language, warning.context);
    const suggestions = this.generateSuggestionsForWarning(warning);

    return {
      ruleName: warning.ruleName,
      code: warning.code,
      message: localizedMessage,
      field: warning.field,
      value: warning.value,
      suggestions,
      context: warning.context,
      timestamp: warning.timestamp
    };
  }

  /**
   * Localize message with template substitution
   */
  private localizeMessage(
    code: string,
    fallbackMessage: string,
    language: string,
    context?: any
  ): LocalizedMessage {
    const templates = this.localizationConfig.messageTemplates[language] || 
                     this.localizationConfig.messageTemplates[this.localizationConfig.defaultLanguage];

    let template = templates[code];
    if (!template) {
      // Try to find a generic template based on code pattern
      template = this.findGenericTemplate(code, templates);
    }

    if (!template) {
      template = fallbackMessage;
    }

    // Substitute parameters
    const localizedText = this.substituteParameters(template, context);

    return {
      de: localizedText,
      en: this.getEnglishTranslation(code, context),
      key: code,
      params: context
    };
  }

  /**
   * Find generic template for unknown codes
   */
  private findGenericTemplate(code: string, templates: Record<string, string>): string | undefined {
    // Try to match patterns
    if (code.includes('REQUIRED')) return templates['REQUIRED_FIELD'];
    if (code.includes('INVALID')) return templates['INVALID_FORMAT'];
    if (code.includes('DUPLICATE')) return templates['DUPLICATE_VALUE'];
    if (code.includes('RANGE')) return templates['INVALID_RANGE'];
    if (code.includes('SYSTEM')) return templates['VALIDATION_SYSTEM_ERROR'];
    
    return undefined;
  }

  /**
   * Get English translation (if available)
   */
  private getEnglishTranslation(code: string, context?: any): string | undefined {
    const englishTemplates = this.localizationConfig.messageTemplates['en'];
    if (!englishTemplates) return undefined;

    const template = englishTemplates[code];
    if (!template) return undefined;

    return this.substituteParameters(template, context);
  }

  /**
   * Substitute parameters in message template
   */
  private substituteParameters(template: string, context?: any): string {
    if (!context) return template;

    let result = template;
    
    // Replace {param} placeholders
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{${key}}`;
      if (result.includes(placeholder)) {
        result = result.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    return result;
  }

  /**
   * Generate suggestions for validation errors
   */
  private generateSuggestions(error: ValidationError): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case 'SAISON_OVERLAP_DETECTED':
        suggestions.push('Ändern Sie das Start- oder Enddatum der Saison');
        suggestions.push('Überprüfen Sie bestehende Saisons und passen Sie deren Zeiträume an');
        break;

      case 'SAISON_ACTIVE_CONSTRAINT':
        suggestions.push('Deaktivieren Sie zuerst die aktuell aktive Saison');
        suggestions.push('Nur eine Saison kann gleichzeitig aktiv sein');
        break;

      case 'TEAM_DUPLICATE_IN_LEAGUE':
        suggestions.push('Wählen Sie einen anderen Team-Namen');
        suggestions.push('Überprüfen Sie, ob das Team bereits in einer anderen Liga existiert');
        break;

      case 'TABLE_GAME_CONSISTENCY':
        suggestions.push('Überprüfen Sie die Anzahl der gespielten Spiele');
        suggestions.push('Stellen Sie sicher, dass Siege + Unentschieden + Niederlagen = Spiele');
        break;

      case 'TABLE_POINTS_CALCULATION':
        suggestions.push('Überprüfen Sie die Punktberechnung (3 Punkte pro Sieg, 1 pro Unentschieden)');
        suggestions.push('Korrigieren Sie die Anzahl der Siege und Unentschieden');
        break;

      case 'REQUIRED_FIELD':
        suggestions.push(`Geben Sie einen Wert für das Feld "${error.field}" ein`);
        break;

      case 'INVALID_FORMAT':
        suggestions.push(`Überprüfen Sie das Format für das Feld "${error.field}"`);
        break;

      default:
        suggestions.push('Überprüfen Sie die eingegebenen Daten');
        suggestions.push('Kontaktieren Sie den Administrator bei anhaltenden Problemen');
    }

    return suggestions;
  }

  /**
   * Generate suggestions for validation warnings
   */
  private generateSuggestionsForWarning(warning: ValidationWarning): string[] {
    const suggestions: string[] = [];

    switch (warning.code) {
      case 'TABLE_GOAL_STATISTICS':
        suggestions.push('Überprüfen Sie die Tor-Statistiken auf Plausibilität');
        suggestions.push('Sehr hohe Torwerte könnten auf Eingabefehler hindeuten');
        break;

      case 'TEAM_NAME_TOO_SHORT':
        suggestions.push('Verwenden Sie einen längeren Team-Namen');
        break;

      case 'TEAM_NAME_TOO_LONG':
        suggestions.push('Kürzen Sie den Team-Namen');
        break;

      default:
        suggestions.push('Dies ist eine Warnung - die Operation kann fortgesetzt werden');
        suggestions.push('Überprüfen Sie die Daten bei Gelegenheit');
    }

    return suggestions;
  }

  /**
   * Generate cache key for result
   */
  private generateCacheKey(
    result: ValidationResult,
    contentType: string,
    operation: string,
    language: string
  ): string {
    const resultHash = this.hashObject({
      errors: result.errors.map(e => ({ code: e.code, ruleName: e.ruleName })),
      warnings: result.warnings.map(w => ({ code: w.code, ruleName: w.ruleName })),
      isValid: result.isValid,
      canProceed: result.canProceed
    });

    return `${contentType}-${operation}-${language}-${resultHash}`;
  }

  /**
   * Simple object hashing for cache keys
   */
  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 16);
  }

  /**
   * Get cached result
   */
  private getCachedResult(cacheKey: string): FormattedValidationResult | null {
    const entry = this.resultCache.get(cacheKey);
    if (!entry) return null;

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp.getTime() > entry.ttl) {
      this.resultCache.delete(cacheKey);
      return null;
    }

    // Update hit count
    entry.hits++;
    
    return entry.result;
  }

  /**
   * Cache validation result
   */
  private cacheResult(cacheKey: string, result: FormattedValidationResult): void {
    // Check cache size limit
    if (this.resultCache.size >= this.cacheConfig.maxSize) {
      this.evictOldestEntries();
    }

    const entry: ResultCacheEntry = {
      result,
      timestamp: new Date(),
      ttl: this.cacheConfig.defaultTtl,
      hits: 1
    };

    this.resultCache.set(cacheKey, entry);
  }

  /**
   * Determine if result should be cached
   */
  private shouldCacheResult(result: FormattedValidationResult): boolean {
    // Cache successful validations and results with only warnings
    return result.isValid || result.summary.criticalErrors === 0;
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.resultCache.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
    
    // Remove oldest 25% of entries
    const removeCount = Math.floor(entries.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      this.resultCache.delete(entries[i][0]);
    }

    this.logDebug(`Evicted ${removeCount} cache entries`);
  }

  /**
   * Initialize cleanup interval for expired cache entries
   */
  private initializeCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.cacheConfig.cleanupInterval);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.resultCache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.resultCache.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.logDebug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Clear result cache
   */
  clearCache(): void {
    this.resultCache.clear();
    this.logInfo('Validation result cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const entries = Array.from(this.resultCache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = entries.reduce((sum, entry) => sum + entry.hits, 0);

    return {
      size: this.resultCache.size,
      maxSize: this.cacheConfig.maxSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalHits,
      oldestEntry: entries.length > 0 ? 
        new Date(Math.min(...entries.map(e => e.timestamp.getTime()))) : null,
      newestEntry: entries.length > 0 ? 
        new Date(Math.max(...entries.map(e => e.timestamp.getTime()))) : null
    };
  }

  /**
   * Update localization configuration
   */
  updateLocalizationConfig(config: Partial<LocalizationConfig>): void {
    this.localizationConfig = { ...this.localizationConfig, ...config };
    this.clearCache(); // Clear cache as messages may have changed
    this.logInfo('Localization configuration updated');
  }

  /**
   * Add custom message template
   */
  addMessageTemplate(language: string, code: string, template: string): void {
    if (!this.localizationConfig.messageTemplates[language]) {
      this.localizationConfig.messageTemplates[language] = {};
    }
    
    this.localizationConfig.messageTemplates[language][code] = template;
    this.clearCache(); // Clear cache as messages may have changed
    this.logInfo(`Message template added: ${code} for ${language}`);
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[ValidationResultHandler] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[ValidationResultHandler] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[ValidationResultHandler] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[ValidationResultHandler] ${message}`, error);
  }
}

/**
 * Singleton validation result handler instance
 */
let validationResultHandlerInstance: ValidationResultHandler | null = null;

/**
 * Get or create validation result handler instance
 */
export function getValidationResultHandler(
  strapi?: any,
  localizationConfig?: Partial<LocalizationConfig>
): ValidationResultHandler {
  if (!validationResultHandlerInstance && strapi) {
    validationResultHandlerInstance = new ValidationResultHandler(strapi, localizationConfig);
  }
  
  if (!validationResultHandlerInstance) {
    throw new Error('ValidationResultHandler not initialized. Call with strapi instance first.');
  }
  
  return validationResultHandlerInstance;
}

/**
 * Initialize validation result handler with strapi instance
 */
export function initializeValidationResultHandler(
  strapi: any,
  localizationConfig?: Partial<LocalizationConfig>
): ValidationResultHandler {
  validationResultHandlerInstance = new ValidationResultHandler(strapi, localizationConfig);
  return validationResultHandlerInstance;
}

/**
 * Reset validation result handler instance (mainly for testing)
 */
export function resetValidationResultHandler(): void {
  validationResultHandlerInstance = null;
}

export default ValidationResultHandler;
export type {
  LocalizedMessage,
  FormattedValidationResult,
  FormattedValidationError,
  FormattedValidationWarning,
  LocalizationConfig
};