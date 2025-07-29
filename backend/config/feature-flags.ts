/**
 * Feature Flags Configuration for Club System Rollout
 * 
 * This configuration allows for gradual rollout of club system features
 * across different environments and user groups.
 */

export interface FeatureFlags {
  // Core Club System Features
  enableClubCollection: boolean;
  enableClubGames: boolean;
  enableClubTables: boolean;
  enableClubMigration: boolean;
  enableClubValidation: boolean;
  enableClubCaching: boolean;
  
  // Admin Panel Features
  enableClubAdminPanel: boolean;
  enableClubBulkOperations: boolean;
  enableClubLogoManagement: boolean;
  enableMigrationManagement: boolean;
  
  // Performance Features
  enableClubPerformanceOptimizations: boolean;
  enableClubMetrics: boolean;
  enableClubMonitoring: boolean;
  
  // Safety Features
  enableClubDataValidation: boolean;
  enableClubBackupRestore: boolean;
  enableEmergencyRollback: boolean;
  
  // Rollout Control
  clubSystemRolloutPercentage: number;
  enableGradualMigration: boolean;
  enableParallelSystems: boolean;
}

export const getFeatureFlags = (env: any): FeatureFlags => {
  const nodeEnv = env('NODE_ENV', 'development');
  
  // Base configuration for all environments
  const baseFlags: FeatureFlags = {
    // Core features - controlled by environment variables
    enableClubCollection: env.bool('ENABLE_CLUB_COLLECTION', false),
    enableClubGames: env.bool('ENABLE_CLUB_GAMES', false),
    enableClubTables: env.bool('ENABLE_CLUB_TABLES', false),
    enableClubMigration: env.bool('ENABLE_CLUB_MIGRATION', false),
    enableClubValidation: env.bool('ENABLE_CLUB_VALIDATION', true),
    enableClubCaching: env.bool('ENABLE_CLUB_CACHING', true),
    
    // Admin panel features
    enableClubAdminPanel: env.bool('ENABLE_CLUB_ADMIN_PANEL', false),
    enableClubBulkOperations: env.bool('ENABLE_CLUB_BULK_OPERATIONS', false),
    enableClubLogoManagement: env.bool('ENABLE_CLUB_LOGO_MANAGEMENT', false),
    enableMigrationManagement: env.bool('ENABLE_MIGRATION_MANAGEMENT', false),
    
    // Performance features
    enableClubPerformanceOptimizations: env.bool('ENABLE_CLUB_PERFORMANCE_OPTIMIZATIONS', true),
    enableClubMetrics: env.bool('ENABLE_CLUB_METRICS', true),
    enableClubMonitoring: env.bool('ENABLE_CLUB_MONITORING', true),
    
    // Safety features - always enabled
    enableClubDataValidation: env.bool('ENABLE_CLUB_DATA_VALIDATION', true),
    enableClubBackupRestore: env.bool('ENABLE_CLUB_BACKUP_RESTORE', true),
    enableEmergencyRollback: env.bool('ENABLE_EMERGENCY_ROLLBACK', true),
    
    // Rollout control
    clubSystemRolloutPercentage: env.int('CLUB_SYSTEM_ROLLOUT_PERCENTAGE', 0),
    enableGradualMigration: env.bool('ENABLE_GRADUAL_MIGRATION', true),
    enableParallelSystems: env.bool('ENABLE_PARALLEL_SYSTEMS', true),
  };

  // Environment-specific overrides
  switch (nodeEnv) {
    case 'development':
      return {
        ...baseFlags,
        // Enable all features in development for testing
        enableClubCollection: env.bool('ENABLE_CLUB_COLLECTION', true),
        enableClubGames: env.bool('ENABLE_CLUB_GAMES', true),
        enableClubTables: env.bool('ENABLE_CLUB_TABLES', true),
        enableClubMigration: env.bool('ENABLE_CLUB_MIGRATION', true),
        enableClubAdminPanel: env.bool('ENABLE_CLUB_ADMIN_PANEL', true),
        enableClubBulkOperations: env.bool('ENABLE_CLUB_BULK_OPERATIONS', true),
        enableClubLogoManagement: env.bool('ENABLE_CLUB_LOGO_MANAGEMENT', true),
        enableMigrationManagement: env.bool('ENABLE_MIGRATION_MANAGEMENT', true),
        clubSystemRolloutPercentage: env.int('CLUB_SYSTEM_ROLLOUT_PERCENTAGE', 100),
      };
      
    case 'test':
      return {
        ...baseFlags,
        // Enable core features for testing
        enableClubCollection: true,
        enableClubGames: true,
        enableClubTables: true,
        enableClubMigration: true,
        enableClubValidation: true,
        enableClubAdminPanel: true,
        clubSystemRolloutPercentage: 100,
        enableParallelSystems: false, // Simplify for testing
      };
      
    case 'staging':
      return {
        ...baseFlags,
        // Conservative rollout in staging
        clubSystemRolloutPercentage: env.int('CLUB_SYSTEM_ROLLOUT_PERCENTAGE', 50),
        enableGradualMigration: true,
        enableParallelSystems: true,
      };
      
    case 'production':
      return {
        ...baseFlags,
        // Very conservative rollout in production
        clubSystemRolloutPercentage: env.int('CLUB_SYSTEM_ROLLOUT_PERCENTAGE', 10),
        enableGradualMigration: true,
        enableParallelSystems: true,
        // Ensure safety features are always enabled
        enableClubDataValidation: true,
        enableClubBackupRestore: true,
        enableEmergencyRollback: true,
      };
      
    default:
      return baseFlags;
  }
};

// Feature flag middleware for runtime checks
export const checkFeatureFlag = (flags: FeatureFlags, flagName: keyof FeatureFlags): boolean => {
  const flagValue = flags[flagName];
  
  // Handle percentage-based rollout
  if (flagName === 'clubSystemRolloutPercentage') {
    return true; // This is handled separately
  }
  
  // For boolean flags, also check rollout percentage
  if (typeof flagValue === 'boolean' && flagValue) {
    const rolloutPercentage = flags.clubSystemRolloutPercentage;
    if (rolloutPercentage < 100) {
      // Simple hash-based rollout (in real implementation, use user ID or session)
      const hash = Math.abs(Date.now() % 100);
      return hash < rolloutPercentage;
    }
  }
  
  return Boolean(flagValue);
};

// Export singleton instance
let featureFlagsInstance: FeatureFlags | null = null;

export const initializeFeatureFlags = (env: any): FeatureFlags => {
  featureFlagsInstance = getFeatureFlags(env);
  return featureFlagsInstance;
};

export const getFeatureFlagsInstance = (): FeatureFlags => {
  if (!featureFlagsInstance) {
    throw new Error('Feature flags not initialized. Call initializeFeatureFlags first.');
  }
  return featureFlagsInstance;
};

// Utility functions for common checks
export const isClubSystemEnabled = (): boolean => {
  const flags = getFeatureFlagsInstance();
  return checkFeatureFlag(flags, 'enableClubCollection') && 
         checkFeatureFlag(flags, 'enableClubGames') && 
         checkFeatureFlag(flags, 'enableClubTables');
};

export const isClubMigrationEnabled = (): boolean => {
  const flags = getFeatureFlagsInstance();
  return checkFeatureFlag(flags, 'enableClubMigration');
};

export const isClubAdminEnabled = (): boolean => {
  const flags = getFeatureFlagsInstance();
  return checkFeatureFlag(flags, 'enableClubAdminPanel');
};

export const canPerformClubOperations = (): boolean => {
  const flags = getFeatureFlagsInstance();
  return checkFeatureFlag(flags, 'enableClubCollection') && 
         checkFeatureFlag(flags, 'enableClubValidation');
};