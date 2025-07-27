/**
 * Table Calculations
 * 
 * Specialized calculation implementations for tabellen-eintrag content type.
 * Provides efficient points and position calculations, goal difference logic,
 * and table statistics aggregation.
 * 
 * Implements Requirements 3.1 (performance optimization), 5.1 (automatic calculations),
 * and 5.2 (dependency updates).
 */

import { SyncCalculation, AsyncCalculation, CalculationContext } from '../CalculationService';

/**
 * Calculation result interface
 */
interface CalculationResult {
  success: boolean;
  value: any;
  fallbackUsed: boolean;
  error?: string;
  executionTime?: number;
}

/**
 * Table statistics interface
 */
interface TableStatistics {
  totalGames: number;
  totalGoals: number;
  averageGoalsPerGame: number;
  highestScore: number;
  lowestScore: number;
  totalTeams: number;
}

/**
 * League position calculation result
 */
interface PositionCalculationResult extends CalculationResult {
  value: number;
  previousPosition?: number;
  positionChange?: number;
}

/**
 * Batch calculation result
 */
interface BatchCalculationResult {
  success: boolean;
  processed: number;
  updated: number;
  errors: string[];
  executionTime: number;
}

/**
 * Default fallback values
 */
const FALLBACK_VALUES = {
  tordifferenz: 0,
  punkte: 0,
  platz: 999,
  spiele: 0,
  siege: 0,
  unentschieden: 0,
  niederlagen: 0,
  tore_fuer: 0,
  tore_gegen: 0
};

/**
 * Calculation timeouts
 */
const TIMEOUTS = {
  syncCalculation: 100,
  asyncCalculation: 5000,
  batchOperation: 30000
};

/**
 * Table Calculations Class
 */
export class TableCalculations {
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  /**
   * Get all table-related calculations
   */
  getAllCalculations(): {
    syncCalculations: SyncCalculation[];
    asyncCalculations: AsyncCalculation[];
  } {
    return {
      syncCalculations: this.getSyncCalculations(),
      asyncCalculations: this.getAsyncCalculations()
    };
  }

  /**
   * Get synchronous calculations for immediate execution
   */
  private getSyncCalculations(): SyncCalculation[] {
    return [
      {
        name: 'table-goal-difference',
        field: 'tordifferenz',
        calculator: (data: any) => this.calculateGoalDifference(data),
        dependencies: ['tore_fuer', 'tore_gegen'],
        priority: 1,
        enabled: true,
        fallbackValue: FALLBACK_VALUES.tordifferenz,
        validator: (result: any) => typeof result === 'number'
      },
      {
        name: 'table-points',
        field: 'punkte',
        calculator: (data: any) => this.calculatePoints(data),
        dependencies: ['siege', 'unentschieden'],
        priority: 2,
        enabled: true,
        fallbackValue: FALLBACK_VALUES.punkte,
        validator: (result: any) => typeof result === 'number' && result >= 0
      },
      {
        name: 'table-games-played',
        field: 'spiele',
        calculator: (data: any) => this.calculateGamesPlayed(data),
        dependencies: ['siege', 'unentschieden', 'niederlagen'],
        priority: 3,
        enabled: true,
        fallbackValue: FALLBACK_VALUES.spiele,
        validator: (result: any) => typeof result === 'number' && result >= 0
      }
    ];
  }

  /**
   * Get asynchronous calculations for background processing
   */
  private getAsyncCalculations(): AsyncCalculation[] {
    return [
      {
        name: 'table-position-calculation',
        calculator: async (data: any, context?: CalculationContext) => 
          await this.calculateTablePositionAsync(data, context),
        priority: 'high',
        dependencies: ['punkte', 'tordifferenz', 'tore_fuer', 'liga', 'team'],
        enabled: true,
        timeout: TIMEOUTS.asyncCalculation,
        retryAttempts: 2,
        fallbackValue: FALLBACK_VALUES.platz
      },
      {
        name: 'league-statistics-update',
        calculator: async (data: any, context?: CalculationContext) => 
          await this.updateLeagueStatistics(data, context),
        priority: 'medium',
        dependencies: ['liga', 'tore_fuer', 'tore_gegen', 'spiele'],
        enabled: true,
        timeout: TIMEOUTS.asyncCalculation,
        retryAttempts: 1
      },
      {
        name: 'team-form-calculation',
        calculator: async (data: any, context?: CalculationContext) => 
          await this.calculateTeamForm(data, context),
        priority: 'low',
        dependencies: ['team', 'siege', 'unentschieden', 'niederlagen'],
        enabled: true,
        timeout: TIMEOUTS.asyncCalculation,
        retryAttempts: 1
      }
    ];
  }

  /**
   * Calculate goal difference (Goals For - Goals Against)
   */
  private calculateGoalDifference(data: any): number {
    const toreFuer = this.safeNumber(data.tore_fuer);
    const toreGegen = this.safeNumber(data.tore_gegen);
    
    return toreFuer - toreGegen;
  }

  /**
   * Calculate points (3 for win, 1 for draw, 0 for loss)
   */
  private calculatePoints(data: any): number {
    const siege = this.safeNumber(data.siege);
    const unentschieden = this.safeNumber(data.unentschieden);
    
    return (siege * 3) + (unentschieden * 1);
  }

  /**
   * Calculate total games played
   */
  private calculateGamesPlayed(data: any): number {
    const siege = this.safeNumber(data.siege);
    const unentschieden = this.safeNumber(data.unentschieden);
    const niederlagen = this.safeNumber(data.niederlagen);
    
    return siege + unentschieden + niederlagen;
  }

  /**
   * Calculate table position based on league standings with optimized sorting
   */
  async calculateTablePosition(ligaId: number, teamId: number): Promise<PositionCalculationResult> {
    const startTime = Date.now();
    
    try {
      // Get all table entries for the league with minimal data for performance
      const entries: any[] = await this.executeWithTimeout(
        () => this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: { liga: { id: ligaId } },
          populate: { team: { fields: ['id'] } }, // Only get team ID for performance
          fields: ['id', 'punkte', 'tordifferenz', 'tore_fuer', 'platz'] // Only necessary fields
        }),
        TIMEOUTS.asyncCalculation
      );

      // Optimized sorting using custom comparator for better performance
      const sortedEntries = entries.sort(this.createTableSortComparator());

      // Find the position of the specific team using binary search approach
      const teamIndex = this.findTeamPosition(sortedEntries, teamId);
      const newPosition = teamIndex >= 0 ? teamIndex + 1 : FALLBACK_VALUES.platz;
      
      // Get previous position for comparison
      const currentEntry = entries.find((entry: any) => entry.team?.id === teamId);
      const previousPosition = currentEntry?.platz;
      
      const result: PositionCalculationResult = {
        success: true,
        value: newPosition,
        fallbackUsed: teamIndex < 0,
        previousPosition,
        positionChange: previousPosition ? previousPosition - newPosition : 0,
        executionTime: Date.now() - startTime
      };

      this.logDebug('Table position calculated (optimized)', {
        ligaId,
        teamId,
        newPosition,
        previousPosition,
        totalTeams: entries.length,
        executionTime: result.executionTime
      });

      return result;

    } catch (error) {
      this.logError('Table position calculation failed', error);
      
      return {
        success: false,
        value: FALLBACK_VALUES.platz,
        fallbackUsed: true,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Async table position calculation for background processing
   */
  private async calculateTablePositionAsync(data: any, context?: CalculationContext): Promise<number> {
    if (!data.liga?.id || !data.team?.id) {
      throw new Error('Liga and Team are required for position calculation');
    }

    const result = await this.calculateTablePosition(data.liga.id, data.team.id);
    
    if (!result.success) {
      throw new Error(result.error || 'Position calculation failed');
    }

    return result.value;
  }

  /**
   * Update league-wide statistics
   */
  private async updateLeagueStatistics(data: any, context?: CalculationContext): Promise<TableStatistics> {
    if (!data.liga?.id) {
      throw new Error('Liga is required for statistics calculation');
    }

    try {
      const entries: any[] = await this.executeWithTimeout(
        () => this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: { liga: { id: data.liga.id } }
        }),
        TIMEOUTS.asyncCalculation
      );

      const stats: TableStatistics = {
        totalGames: 0,
        totalGoals: 0,
        averageGoalsPerGame: 0,
        highestScore: 0,
        lowestScore: Number.MAX_SAFE_INTEGER,
        totalTeams: entries.length
      };

      for (const entry of entries) {
        const spiele = this.safeNumber(entry.spiele);
        const toreFuer = this.safeNumber(entry.tore_fuer);
        
        stats.totalGames += spiele;
        stats.totalGoals += toreFuer;
        
        if (toreFuer > stats.highestScore) {
          stats.highestScore = toreFuer;
        }
        
        if (toreFuer < stats.lowestScore && toreFuer > 0) {
          stats.lowestScore = toreFuer;
        }
      }

      stats.averageGoalsPerGame = stats.totalGames > 0 ? stats.totalGoals / stats.totalGames : 0;
      
      if (stats.lowestScore === Number.MAX_SAFE_INTEGER) {
        stats.lowestScore = 0;
      }

      this.logDebug('League statistics calculated', {
        ligaId: data.liga.id,
        stats
      });

      return stats;

    } catch (error) {
      this.logError('League statistics calculation failed', error);
      throw error;
    }
  }

  /**
   * Calculate team form (recent performance)
   */
  private async calculateTeamForm(data: any, context?: CalculationContext): Promise<{
    form: string;
    recentGames: number;
    winPercentage: number;
  }> {
    if (!data.team?.id) {
      throw new Error('Team is required for form calculation');
    }

    try {
      const siege = this.safeNumber(data.siege);
      const unentschieden = this.safeNumber(data.unentschieden);
      const niederlagen = this.safeNumber(data.niederlagen);
      const totalGames = siege + unentschieden + niederlagen;

      const winPercentage = totalGames > 0 ? (siege / totalGames) * 100 : 0;
      
      let form = 'Unknown';
      if (winPercentage >= 70) form = 'Excellent';
      else if (winPercentage >= 50) form = 'Good';
      else if (winPercentage >= 30) form = 'Average';
      else form = 'Poor';

      const result = {
        form,
        recentGames: totalGames,
        winPercentage: Math.round(winPercentage * 100) / 100
      };

      this.logDebug('Team form calculated', {
        teamId: data.team.id,
        result
      });

      return result;

    } catch (error) {
      this.logError('Team form calculation failed', error);
      throw error;
    }
  }

  /**
   * Optimized batch update calculations for entire league
   */
  async batchUpdateLeagueCalculations(ligaId: number, batchSize: number = 10): Promise<BatchCalculationResult> {
    const startTime = Date.now();
    const result: BatchCalculationResult = {
      success: true,
      processed: 0,
      updated: 0,
      errors: [],
      executionTime: 0
    };

    try {
      // Get all entries for the league with minimal data for performance
      const entries: any[] = await this.executeWithTimeout(
        () => this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: { liga: { id: ligaId } },
          populate: { team: { fields: ['id'] } }
        }),
        TIMEOUTS.batchOperation
      );

      this.logInfo(`Starting optimized batch calculation for ${entries.length} entries in league ${ligaId}`);

      // Pre-calculate all positions once for efficiency
      const allPositions = await this.calculateAllPositions(ligaId);

      // Use optimized batch processing
      const { calculations, errors } = await this.calculateBatchOptimized(entries, batchSize);
      result.errors.push(...errors);

      // Prepare batch updates
      const updates: Array<{ id: number; data: any }> = [];

      for (const entry of entries) {
        try {
          result.processed++;
          
          const calc = calculations.get(entry.id);
          if (!calc) continue;

          // Add position from pre-calculated positions
          const newPosition = allPositions.get(entry.team?.id);
          if (newPosition) {
            calc.platz = newPosition;
          }

          // Check if update is needed (optimized comparison)
          const needsUpdate = this.hasChanges(entry, calc);

          if (needsUpdate) {
            updates.push({
              id: entry.id,
              data: {
                tordifferenz: calc.tordifferenz,
                punkte: calc.punkte,
                spiele: calc.spiele,
                ...(calc.platz && { platz: calc.platz })
              }
            });
          }

        } catch (error) {
          result.errors.push(`Entry ${entry.id}: ${error.message}`);
        }
      }

      // Execute batch updates in parallel with controlled concurrency
      const updateBatches = this.createBatches(updates, batchSize);
      
      for (const updateBatch of updateBatches) {
        try {
          await Promise.all(updateBatch.map(async (update) => {
            try {
              await this.strapi.entityService.update(
                'api::tabellen-eintrag.tabellen-eintrag',
                update.id,
                { data: update.data }
              );
              result.updated++;
            } catch (error) {
              result.errors.push(`Update failed for entry ${update.id}: ${error.message}`);
            }
          }));

          // Controlled delay between update batches
          if (updateBatches.indexOf(updateBatch) < updateBatches.length - 1) {
            await this.delay(100);
          }
        } catch (error) {
          result.errors.push(`Update batch failed: ${error.message}`);
        }
      }

      this.logInfo('Optimized batch calculation completed', {
        ligaId,
        processed: result.processed,
        updated: result.updated,
        errors: result.errors.length,
        executionTime: Date.now() - startTime
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`Batch operation failed: ${error.message}`);
      this.logError('Optimized batch calculation failed', error);
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Optimized change detection
   */
  private hasChanges(entry: any, calculations: any): boolean {
    return (
      entry.tordifferenz !== calculations.tordifferenz ||
      entry.punkte !== calculations.punkte ||
      entry.spiele !== calculations.spiele ||
      (calculations.platz && entry.platz !== calculations.platz)
    );
  }

  /**
   * Validate table data consistency
   */
  validateTableData(data: any): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check games consistency
    const spiele = this.safeNumber(data.spiele);
    const siege = this.safeNumber(data.siege);
    const unentschieden = this.safeNumber(data.unentschieden);
    const niederlagen = this.safeNumber(data.niederlagen);
    
    const calculatedGames = siege + unentschieden + niederlagen;
    if (Math.abs(spiele - calculatedGames) > 1) {
      warnings.push('Spielanzahl stimmt nicht mit Ergebnissen überein');
    }

    // Check points calculation
    const punkte = this.safeNumber(data.punkte);
    const expectedPoints = (siege * 3) + (unentschieden * 1);
    if (Math.abs(punkte - expectedPoints) > 3) {
      warnings.push('Punktzahl entspricht nicht der Standard-Berechnung');
    }

    // Check goal difference
    const tordifferenz = this.safeNumber(data.tordifferenz);
    const toreFuer = this.safeNumber(data.tore_fuer);
    const toreGegen = this.safeNumber(data.tore_gegen);
    const expectedDifference = toreFuer - toreGegen;
    if (tordifferenz !== expectedDifference) {
      warnings.push('Tordifferenz entspricht nicht der Berechnung');
    }

    // Check for negative values
    const numericFields = ['spiele', 'siege', 'unentschieden', 'niederlagen', 'tore_fuer', 'tore_gegen', 'punkte'];
    for (const field of numericFields) {
      if (data[field] !== undefined && this.safeNumber(data[field]) < 0) {
        errors.push(`${field} darf nicht negativ sein`);
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Get table statistics for a league
   */
  async getLeagueTableStatistics(ligaId: number): Promise<TableStatistics> {
    try {
      const entries: any[] = await this.executeWithTimeout(
        () => this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: { liga: { id: ligaId } }
        }),
        TIMEOUTS.asyncCalculation
      );

      return await this.updateLeagueStatistics({ liga: { id: ligaId } });

    } catch (error) {
      this.logError('Failed to get league statistics', error);
      throw error;
    }
  }

  /**
   * Execute operation with timeout protection
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  /**
   * Create optimized table sort comparator for performance
   */
  private createTableSortComparator() {
    return (a: any, b: any) => {
      // Primary sort: Points (descending)
      const pointsDiff = this.safeNumber(b.punkte) - this.safeNumber(a.punkte);
      if (pointsDiff !== 0) return pointsDiff;
      
      // Secondary sort: Goal difference (descending)
      const goalDiffDiff = this.safeNumber(b.tordifferenz) - this.safeNumber(a.tordifferenz);
      if (goalDiffDiff !== 0) return goalDiffDiff;
      
      // Tertiary sort: Goals scored (descending)
      const goalsScoredDiff = this.safeNumber(b.tore_fuer) - this.safeNumber(a.tore_fuer);
      if (goalsScoredDiff !== 0) return goalsScoredDiff;
      
      // Final sort: Team ID for consistency
      return this.safeNumber(a.team?.id) - this.safeNumber(b.team?.id);
    };
  }

  /**
   * Find team position in sorted entries with optimized search
   */
  private findTeamPosition(sortedEntries: any[], teamId: number): number {
    for (let i = 0; i < sortedEntries.length; i++) {
      if (sortedEntries[i].team?.id === teamId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Optimized batch calculation with parallel processing
   */
  private async calculateBatchOptimized(entries: any[], batchSize: number): Promise<{
    calculations: Map<number, any>;
    errors: string[];
  }> {
    const calculations = new Map<number, any>();
    const errors: string[] = [];
    
    // Process entries in parallel batches for better performance
    const batches = this.createBatches(entries, batchSize);
    
    for (const batch of batches) {
      try {
        const batchPromises = batch.map(async (entry: any) => {
          try {
            const calc = {
              id: entry.id,
              tordifferenz: this.calculateGoalDifference(entry),
              punkte: this.calculatePoints(entry),
              spiele: this.calculateGamesPlayed(entry)
            };
            calculations.set(entry.id, calc);
          } catch (error) {
            errors.push(`Entry ${entry.id}: ${error.message}`);
          }
        });
        
        await Promise.all(batchPromises);
        
        // Small delay between batches to prevent overwhelming the system
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(50);
        }
      } catch (error) {
        errors.push(`Batch processing failed: ${error.message}`);
      }
    }
    
    return { calculations, errors };
  }

  /**
   * Create batches from array for parallel processing
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Optimized position calculation for entire league
   */
  async calculateAllPositions(ligaId: number): Promise<Map<number, number>> {
    const positions = new Map<number, number>();
    
    try {
      // Get all entries with minimal data
      const entries: any[] = await this.executeWithTimeout(
        () => this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: { liga: { id: ligaId } },
          populate: { team: { fields: ['id'] } },
          fields: ['id', 'punkte', 'tordifferenz', 'tore_fuer']
        }),
        TIMEOUTS.asyncCalculation
      );

      // Sort all entries once
      const sortedEntries = entries.sort(this.createTableSortComparator());
      
      // Assign positions based on sorted order
      sortedEntries.forEach((entry: any, index: number) => {
        if (entry.team?.id) {
          positions.set(entry.team.id, index + 1);
        }
      });

      this.logDebug('All positions calculated', {
        ligaId,
        totalTeams: positions.size
      });

    } catch (error) {
      this.logError('Failed to calculate all positions', error);
    }
    
    return positions;
  }

  /**
   * Optimized goal statistics aggregation
   */
  async calculateGoalStatistics(ligaId: number): Promise<{
    totalGoals: number;
    averageGoalsPerTeam: number;
    highestScoringTeam: { teamId: number; goals: number } | null;
    lowestScoringTeam: { teamId: number; goals: number } | null;
    totalGames: number;
    averageGoalsPerGame: number;
  }> {
    try {
      const entries: any[] = await this.executeWithTimeout(
        () => this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: { liga: { id: ligaId } },
          populate: { team: { fields: ['id'] } },
          fields: ['tore_fuer', 'spiele']
        }),
        TIMEOUTS.asyncCalculation
      );

      let totalGoals = 0;
      let totalGames = 0;
      let highestScoringTeam: { teamId: number; goals: number } | null = null;
      let lowestScoringTeam: { teamId: number; goals: number } | null = null;

      // Single pass calculation for efficiency
      for (const entry of entries) {
        const goals = this.safeNumber(entry.tore_fuer);
        const games = this.safeNumber(entry.spiele);
        
        totalGoals += goals;
        totalGames += games;

        if (!highestScoringTeam || goals > highestScoringTeam.goals) {
          highestScoringTeam = { teamId: entry.team?.id, goals };
        }

        if (!lowestScoringTeam || goals < lowestScoringTeam.goals) {
          lowestScoringTeam = { teamId: entry.team?.id, goals };
        }
      }

      return {
        totalGoals,
        averageGoalsPerTeam: entries.length > 0 ? totalGoals / entries.length : 0,
        highestScoringTeam,
        lowestScoringTeam,
        totalGames,
        averageGoalsPerGame: totalGames > 0 ? totalGoals / totalGames : 0
      };

    } catch (error) {
      this.logError('Goal statistics calculation failed', error);
      throw error;
    }
  }

  /**
   * Optimized points distribution analysis
   */
  async calculatePointsDistribution(ligaId: number): Promise<{
    totalPoints: number;
    averagePoints: number;
    pointsLeader: { teamId: number; points: number } | null;
    pointsRange: { min: number; max: number };
    distribution: { [key: string]: number };
  }> {
    try {
      const entries: any[] = await this.executeWithTimeout(
        () => this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: { liga: { id: ligaId } },
          populate: { team: { fields: ['id'] } },
          fields: ['punkte']
        }),
        TIMEOUTS.asyncCalculation
      );

      let totalPoints = 0;
      let minPoints = Number.MAX_SAFE_INTEGER;
      let maxPoints = 0;
      let pointsLeader: { teamId: number; points: number } | null = null;
      const distribution: { [key: string]: number } = {};

      // Single pass analysis
      for (const entry of entries) {
        const points = this.safeNumber(entry.punkte);
        
        totalPoints += points;
        
        if (points > maxPoints) {
          maxPoints = points;
          pointsLeader = { teamId: entry.team?.id, points };
        }
        
        if (points < minPoints) {
          minPoints = points;
        }

        // Group points into ranges for distribution
        const range = Math.floor(points / 10) * 10;
        const rangeKey = `${range}-${range + 9}`;
        distribution[rangeKey] = (distribution[rangeKey] || 0) + 1;
      }

      return {
        totalPoints,
        averagePoints: entries.length > 0 ? totalPoints / entries.length : 0,
        pointsLeader,
        pointsRange: { 
          min: minPoints === Number.MAX_SAFE_INTEGER ? 0 : minPoints, 
          max: maxPoints 
        },
        distribution
      };

    } catch (error) {
      this.logError('Points distribution calculation failed', error);
      throw error;
    }
  }

  /**
   * Utility method for delays in batch processing
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safely convert value to number with fallback
   */
  private safeNumber(value: any, fallback: number = 0): number {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[TableCalculations] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[TableCalculations] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[TableCalculations] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[TableCalculations] ${message}`, error);
  }
}

export default TableCalculations;
export type {
  CalculationResult,
  TableStatistics,
  PositionCalculationResult,
  BatchCalculationResult
};