/**
 * Feature Flag Management Interface
 * 
 * Provides administration interface for feature flag management including
 * rollout controls, analytics, and user-friendly management tools.
 * 
 * Requirements: 6.2, 7.4
 */

import { EventEmitter } from 'events';
import { FeatureFlagService, FeatureFlag, FeatureFlagEvaluationResult, RolloutConfiguration } from './FeatureFlagService';
import { StructuredLogger } from '../logging/StructuredLogger';

/**
 * Feature flag rollout status
 */
export interface RolloutStatus {
  flagName: string;
  isActive: boolean;
  currentPercentage: number;
  targetPercentage: number;
  startDate: Date;
  endDate?: Date;
  usersAffected: number;
  successRate: number;
  errorRate: number;
  rollbackThreshold: number;
  autoRollback: boolean;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'rolled_back';
}

/**
 * Feature flag analytics data
 */
export interface FeatureFlagAnalytics {
  flagName: string;
  evaluationCount: number;
  enabledCount: number;
  disabledCount: number;
  enabledPercentage: number;
  averageEvaluationTime: number;
  errorCount: number;
  errorRate: number;
  uniqueUsers: number;
  evaluationTrends: Array<{
    timestamp: Date;
    evaluations: number;
    enabled: number;
    disabled: number;
    errors: number;
  }>;
  userSegments: Array<{
    segment: string;
    evaluations: number;
    enabledPercentage: number;
  }>;
  performanceImpact: {
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRateChange: number;
  };
}

/**
 * Rollout configuration template
 */
export interface RolloutTemplate {
  name: string;
  description: string;
  strategy: 'canary' | 'blue_green' | 'gradual' | 'instant';
  phases: Array<{
    name: string;
    percentage: number;
    duration: number; // minutes
    successCriteria: {
      maxErrorRate: number;
      minSuccessRate: number;
    };
    rollbackCriteria: {
      maxErrorRate: number;
      maxResponseTime: number;
    };
  }>;
  autoAdvance: boolean;
  autoRollback: boolean;
}

/**
 * Feature flag management configuration
 */
export interface ManagementConfig {
  enableAnalytics: boolean;
  analyticsRetentionDays: number;
  enableAutoRollback: boolean;
  defaultRollbackThreshold: number;
  enableNotifications: boolean;
  notificationChannels: string[];
  enableAuditLog: boolean;
  maxRolloutDuration: number; // hours
}

/**
 * Default management configuration
 */
const DEFAULT_MANAGEMENT_CONFIG: ManagementConfig = {
  enableAnalytics: true,
  analyticsRetentionDays: 30,
  enableAutoRollback: true,
  defaultRollbackThreshold: 5, // 5% error rate
  enableNotifications: true,
  notificationChannels: ['email', 'webhook'],
  enableAuditLog: true,
  maxRolloutDuration: 24 // 24 hours
};

/**
 * Default rollout templates
 */
const DEFAULT_ROLLOUT_TEMPLATES: RolloutTemplate[] = [
  {
    name: 'Canary Rollout',
    description: 'Gradual rollout starting with 1% of users',
    strategy: 'canary',
    phases: [
      {
        name: 'Canary',
        percentage: 1,
        duration: 30,
        successCriteria: { maxErrorRate: 1, minSuccessRate: 99 },
        rollbackCriteria: { maxErrorRate: 5, maxResponseTime: 1000 }
      },
      {
        name: 'Small Scale',
        percentage: 10,
        duration: 60,
        successCriteria: { maxErrorRate: 2, minSuccessRate: 98 },
        rollbackCriteria: { maxErrorRate: 5, maxResponseTime: 1000 }
      },
      {
        name: 'Full Rollout',
        percentage: 100,
        duration: 0,
        successCriteria: { maxErrorRate: 3, minSuccessRate: 97 },
        rollbackCriteria: { maxErrorRate: 5, maxResponseTime: 1000 }
      }
    ],
    autoAdvance: true,
    autoRollback: true
  },
  {
    name: 'Blue-Green Deployment',
    description: 'Instant switch between two environments',
    strategy: 'blue_green',
    phases: [
      {
        name: 'Green Environment',
        percentage: 100,
        duration: 0,
        successCriteria: { maxErrorRate: 1, minSuccessRate: 99 },
        rollbackCriteria: { maxErrorRate: 3, maxResponseTime: 1000 }
      }
    ],
    autoAdvance: false,
    autoRollback: true
  },
  {
    name: 'Gradual Rollout',
    description: 'Steady increase over time',
    strategy: 'gradual',
    phases: [
      {
        name: 'Phase 1',
        percentage: 25,
        duration: 120,
        successCriteria: { maxErrorRate: 2, minSuccessRate: 98 },
        rollbackCriteria: { maxErrorRate: 5, maxResponseTime: 1000 }
      },
      {
        name: 'Phase 2',
        percentage: 50,
        duration: 120,
        successCriteria: { maxErrorRate: 2, minSuccessRate: 98 },
        rollbackCriteria: { maxErrorRate: 5, maxResponseTime: 1000 }
      },
      {
        name: 'Phase 3',
        percentage: 75,
        duration: 120,
        successCriteria: { maxErrorRate: 2, minSuccessRate: 98 },
        rollbackCriteria: { maxErrorRate: 5, maxResponseTime: 1000 }
      },
      {
        name: 'Full Rollout',
        percentage: 100,
        duration: 0,
        successCriteria: { maxErrorRate: 3, minSuccessRate: 97 },
        rollbackCriteria: { maxErrorRate: 5, maxResponseTime: 1000 }
      }
    ],
    autoAdvance: true,
    autoRollback: true
  }
];

/**
 * Feature Flag Management Service
 */
export class FeatureFlagManagement extends EventEmitter {
  private featureFlagService: FeatureFlagService;
  private strapi: any;
  private logger: StructuredLogger;
  private config: ManagementConfig;

  // Management state
  private activeRollouts: Map<string, RolloutStatus> = new Map();
  private rolloutTemplates: Map<string, RolloutTemplate> = new Map();
  private analyticsData: Map<string, FeatureFlagAnalytics> = new Map();
  private rolloutTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    featureFlagService: FeatureFlagService,
    strapi: any,
    config: Partial<ManagementConfig> = {}
  ) {
    super();
    
    this.featureFlagService = featureFlagService;
    this.strapi = strapi;
    this.logger = new StructuredLogger(strapi);
    this.config = { ...DEFAULT_MANAGEMENT_CONFIG, ...config };

    this.initializeTemplates();
    this.setupEventListeners();
    
    this.logger.info('Feature flag management initialized', {
      enableAnalytics: this.config.enableAnalytics,
      enableAutoRollback: this.config.enableAutoRollback
    });
  }

  /**
   * Create a new feature flag with rollout configuration
   */
  async createFlag(
    flagData: Partial<FeatureFlag>,
    rolloutTemplate?: string
  ): Promise<FeatureFlag> {
    try {
      // Apply rollout template if specified
      if (rolloutTemplate) {
        const template = this.rolloutTemplates.get(rolloutTemplate);
        if (template) {
          flagData.rollout = this.createRolloutFromTemplate(template);
        }
      }

      const flag = await this.featureFlagService.setFlag(flagData);
      
      // Initialize analytics if enabled
      if (this.config.enableAnalytics) {
        this.initializeAnalytics(flag.name);
      }

      // Start rollout if configured
      if (flag.rollout?.enabled) {
        await this.startRollout(flag.name);
      }

      this.emit('flag_created', { flag, rolloutTemplate });
      this.logger.info(`Feature flag created: ${flag.name}`, {
        rolloutEnabled: flag.rollout?.enabled,
        template: rolloutTemplate
      });

      return flag;

    } catch (error) {
      this.logger.error(`Error creating feature flag: ${flagData.name}`, error);
      throw error;
    }
  }

  /**
   * Update feature flag with rollout controls
   */
  async updateFlag(
    flagName: string,
    updates: Partial<FeatureFlag>,
    rolloutOptions?: {
      template?: string;
      startRollout?: boolean;
      pauseRollout?: boolean;
      resumeRollout?: boolean;
      rollback?: boolean;
    }
  ): Promise<FeatureFlag> {
    try {
      const existingFlag = await this.featureFlagService.getAllFlags()
        .then(flags => flags.find(f => f.name === flagName));
      
      if (!existingFlag) {
        throw new Error(`Feature flag not found: ${flagName}`);
      }

      // Apply rollout template if specified
      if (rolloutOptions?.template) {
        const template = this.rolloutTemplates.get(rolloutOptions.template);
        if (template) {
          updates.rollout = this.createRolloutFromTemplate(template);
        }
      }

      const updatedFlag = await this.featureFlagService.setFlag({
        ...existingFlag,
        ...updates
      });

      // Handle rollout operations
      if (rolloutOptions) {
        if (rolloutOptions.startRollout) {
          await this.startRollout(flagName);
        } else if (rolloutOptions.pauseRollout) {
          await this.pauseRollout(flagName);
        } else if (rolloutOptions.resumeRollout) {
          await this.resumeRollout(flagName);
        } else if (rolloutOptions.rollback) {
          await this.rollbackFlag(flagName);
        }
      }

      this.emit('flag_updated', { flag: updatedFlag, previous: existingFlag, rolloutOptions });
      this.logger.info(`Feature flag updated: ${flagName}`, rolloutOptions);

      return updatedFlag;

    } catch (error) {
      this.logger.error(`Error updating feature flag: ${flagName}`, error);
      throw error;
    }
  }

  /**
   * Start rollout for a feature flag
   */
  async startRollout(flagName: string): Promise<RolloutStatus> {
    try {
      const flags = await this.featureFlagService.getAllFlags();
      const flag = flags.find(f => f.name === flagName);
      
      if (!flag || !flag.rollout?.enabled) {
        throw new Error(`Feature flag not found or rollout not configured: ${flagName}`);
      }

      const rolloutStatus: RolloutStatus = {
        flagName,
        isActive: true,
        currentPercentage: 0,
        targetPercentage: flag.rollout.percentage,
        startDate: new Date(),
        endDate: flag.rollout.endDate,
        usersAffected: 0,
        successRate: 100,
        errorRate: 0,
        rollbackThreshold: this.config.defaultRollbackThreshold,
        autoRollback: this.config.enableAutoRollback,
        status: 'active'
      };

      this.activeRollouts.set(flagName, rolloutStatus);

      // Start rollout monitoring
      this.startRolloutMonitoring(flagName);

      this.emit('rollout_started', { flagName, rolloutStatus });
      this.logger.info(`Rollout started for flag: ${flagName}`, rolloutStatus);

      return rolloutStatus;

    } catch (error) {
      this.logger.error(`Error starting rollout for flag: ${flagName}`, error);
      throw error;
    }
  }

  /**
   * Pause rollout
   */
  async pauseRollout(flagName: string): Promise<void> {
    const rolloutStatus = this.activeRollouts.get(flagName);
    if (!rolloutStatus) {
      throw new Error(`No active rollout found for flag: ${flagName}`);
    }

    rolloutStatus.status = 'paused';
    this.stopRolloutTimer(flagName);

    this.emit('rollout_paused', { flagName, rolloutStatus });
    this.logger.info(`Rollout paused for flag: ${flagName}`);
  }

  /**
   * Resume rollout
   */
  async resumeRollout(flagName: string): Promise<void> {
    const rolloutStatus = this.activeRollouts.get(flagName);
    if (!rolloutStatus) {
      throw new Error(`No rollout found for flag: ${flagName}`);
    }

    rolloutStatus.status = 'active';
    this.startRolloutMonitoring(flagName);

    this.emit('rollout_resumed', { flagName, rolloutStatus });
    this.logger.info(`Rollout resumed for flag: ${flagName}`);
  }

  /**
   * Rollback feature flag
   */
  async rollbackFlag(flagName: string): Promise<void> {
    try {
      // Disable the flag
      const flags = await this.featureFlagService.getAllFlags();
      const flag = flags.find(f => f.name === flagName);
      
      if (flag) {
        await this.featureFlagService.setFlag({
          ...flag,
          enabled: false,
          rollout: { ...flag.rollout, enabled: false, percentage: 0 }
        });
      }

      // Update rollout status
      const rolloutStatus = this.activeRollouts.get(flagName);
      if (rolloutStatus) {
        rolloutStatus.status = 'rolled_back';
        rolloutStatus.currentPercentage = 0;
        rolloutStatus.isActive = false;
      }

      this.stopRolloutTimer(flagName);

      this.emit('rollout_rolled_back', { flagName, rolloutStatus });
      this.logger.warn(`Feature flag rolled back: ${flagName}`, { rolloutStatus });

    } catch (error) {
      this.logger.error(`Error rolling back feature flag: ${flagName}`, error);
      throw error;
    }
  }

  /**
   * Get rollout status
   */
  getRolloutStatus(flagName: string): RolloutStatus | null {
    return this.activeRollouts.get(flagName) || null;
  }

  /**
   * Get all active rollouts
   */
  getActiveRollouts(): RolloutStatus[] {
    return Array.from(this.activeRollouts.values())
      .filter(rollout => rollout.isActive);
  }

  /**
   * Get feature flag analytics
   */
  getAnalytics(flagName: string): FeatureFlagAnalytics | null {
    return this.analyticsData.get(flagName) || null;
  }

  /**
   * Get analytics for all flags
   */
  getAllAnalytics(): FeatureFlagAnalytics[] {
    return Array.from(this.analyticsData.values());
  }

  /**
   * Get available rollout templates
   */
  getRolloutTemplates(): RolloutTemplate[] {
    return Array.from(this.rolloutTemplates.values());
  }

  /**
   * Add custom rollout template
   */
  addRolloutTemplate(template: RolloutTemplate): void {
    this.rolloutTemplates.set(template.name, template);
    this.logger.info(`Rollout template added: ${template.name}`);
  }

  /**
   * Update management configuration
   */
  updateConfig(config: Partial<ManagementConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Feature flag management configuration updated', config);
  }

  /**
   * Get management statistics
   */
  getManagementStats(): {
    totalFlags: number;
    activeRollouts: number;
    completedRollouts: number;
    rolledBackFlags: number;
    averageRolloutDuration: number;
    totalEvaluations: number;
    averageEvaluationTime: number;
  } {
    const allRollouts = Array.from(this.activeRollouts.values());
    const analytics = Array.from(this.analyticsData.values());

    return {
      totalFlags: analytics.length,
      activeRollouts: allRollouts.filter(r => r.status === 'active').length,
      completedRollouts: allRollouts.filter(r => r.status === 'completed').length,
      rolledBackFlags: allRollouts.filter(r => r.status === 'rolled_back').length,
      averageRolloutDuration: this.calculateAverageRolloutDuration(allRollouts),
      totalEvaluations: analytics.reduce((sum, a) => sum + a.evaluationCount, 0),
      averageEvaluationTime: analytics.reduce((sum, a) => sum + a.averageEvaluationTime, 0) / analytics.length || 0
    };
  }

  /**
   * Initialize default rollout templates
   */
  private initializeTemplates(): void {
    DEFAULT_ROLLOUT_TEMPLATES.forEach(template => {
      this.rolloutTemplates.set(template.name, template);
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.featureFlagService.on('flagEvaluated', (result: FeatureFlagEvaluationResult) => {
      if (this.config.enableAnalytics) {
        this.updateAnalytics(result);
      }
    });
  }

  /**
   * Create rollout configuration from template
   */
  private createRolloutFromTemplate(template: RolloutTemplate): RolloutConfiguration {
    const firstPhase = template.phases[0];
    
    return {
      enabled: true,
      percentage: firstPhase.percentage,
      strategy: 'random',
      startDate: new Date(),
      endDate: new Date(Date.now() + this.config.maxRolloutDuration * 60 * 60 * 1000)
    };
  }

  /**
   * Initialize analytics for a flag
   */
  private initializeAnalytics(flagName: string): void {
    const analytics: FeatureFlagAnalytics = {
      flagName,
      evaluationCount: 0,
      enabledCount: 0,
      disabledCount: 0,
      enabledPercentage: 0,
      averageEvaluationTime: 0,
      errorCount: 0,
      errorRate: 0,
      uniqueUsers: 0,
      evaluationTrends: [],
      userSegments: [],
      performanceImpact: {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        errorRateChange: 0
      }
    };

    this.analyticsData.set(flagName, analytics);
  }

  /**
   * Update analytics with evaluation result
   */
  private updateAnalytics(result: FeatureFlagEvaluationResult): void {
    const analytics = this.analyticsData.get(result.flagName);
    if (!analytics) return;

    analytics.evaluationCount++;
    
    if (result.enabled) {
      analytics.enabledCount++;
    } else {
      analytics.disabledCount++;
    }

    analytics.enabledPercentage = (analytics.enabledCount / analytics.evaluationCount) * 100;
    
    // Update average evaluation time
    analytics.averageEvaluationTime = (
      (analytics.averageEvaluationTime * (analytics.evaluationCount - 1)) + result.evaluationTime
    ) / analytics.evaluationCount;

    // Add to trends (keep last 100 data points)
    const now = new Date();
    const lastTrend = analytics.evaluationTrends[analytics.evaluationTrends.length - 1];
    
    if (!lastTrend || (now.getTime() - lastTrend.timestamp.getTime()) > 60000) { // 1 minute intervals
      analytics.evaluationTrends.push({
        timestamp: now,
        evaluations: 1,
        enabled: result.enabled ? 1 : 0,
        disabled: result.enabled ? 0 : 1,
        errors: 0
      });
      
      if (analytics.evaluationTrends.length > 100) {
        analytics.evaluationTrends.shift();
      }
    } else {
      lastTrend.evaluations++;
      if (result.enabled) {
        lastTrend.enabled++;
      } else {
        lastTrend.disabled++;
      }
    }
  }

  /**
   * Start rollout monitoring
   */
  private startRolloutMonitoring(flagName: string): void {
    const timer = setInterval(async () => {
      await this.checkRolloutHealth(flagName);
    }, 60000); // Check every minute

    this.rolloutTimers.set(flagName, timer);
  }

  /**
   * Stop rollout timer
   */
  private stopRolloutTimer(flagName: string): void {
    const timer = this.rolloutTimers.get(flagName);
    if (timer) {
      clearInterval(timer);
      this.rolloutTimers.delete(flagName);
    }
  }

  /**
   * Check rollout health and auto-rollback if needed
   */
  private async checkRolloutHealth(flagName: string): Promise<void> {
    const rolloutStatus = this.activeRollouts.get(flagName);
    const analytics = this.analyticsData.get(flagName);
    
    if (!rolloutStatus || !analytics || !rolloutStatus.autoRollback) {
      return;
    }

    // Check error rate
    if (analytics.errorRate > rolloutStatus.rollbackThreshold) {
      this.logger.warn(`Auto-rollback triggered for flag ${flagName}: error rate ${analytics.errorRate}% exceeds threshold ${rolloutStatus.rollbackThreshold}%`);
      await this.rollbackFlag(flagName);
      return;
    }

    // Check if rollout should advance (simplified logic)
    if (rolloutStatus.status === 'active' && rolloutStatus.currentPercentage < rolloutStatus.targetPercentage) {
      // Gradually increase percentage (simplified implementation)
      rolloutStatus.currentPercentage = Math.min(
        rolloutStatus.currentPercentage + 5,
        rolloutStatus.targetPercentage
      );

      if (rolloutStatus.currentPercentage >= rolloutStatus.targetPercentage) {
        rolloutStatus.status = 'completed';
        this.stopRolloutTimer(flagName);
        this.emit('rollout_completed', { flagName, rolloutStatus });
      }
    }
  }

  /**
   * Calculate average rollout duration
   */
  private calculateAverageRolloutDuration(rollouts: RolloutStatus[]): number {
    const completedRollouts = rollouts.filter(r => r.status === 'completed' && r.endDate);
    
    if (completedRollouts.length === 0) return 0;

    const totalDuration = completedRollouts.reduce((sum, rollout) => {
      const duration = rollout.endDate!.getTime() - rollout.startDate.getTime();
      return sum + duration;
    }, 0);

    return totalDuration / completedRollouts.length / (1000 * 60 * 60); // Convert to hours
  }
}

export default FeatureFlagManagement;