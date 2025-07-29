/**
 * Snapshot Service for Table Data Backup and Rollback
 * Handles creating, storing, and restoring table snapshots
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { DEFAULT_AUTOMATION_CONFIG } from '../../../config/automation';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface SnapshotService {
  createSnapshot(ligaId: number, saisonId: number, description?: string): Promise<SnapshotId>;
  restoreSnapshot(snapshotId: SnapshotId): Promise<RestoreResult>;
  listSnapshots(ligaId: number, saisonId: number): Promise<Snapshot[]>;
  deleteSnapshot(snapshotId: SnapshotId): Promise<void>;
  deleteOldSnapshots(maxAge: number): Promise<void>;
  getSnapshot(snapshotId: SnapshotId): Promise<Snapshot | null>;
}

export interface Snapshot {
  id: SnapshotId;
  ligaId: number;
  saisonId: number;
  data: TabellenEintrag[];
  createdAt: Date;
  description: string;
  createdBy?: string;
  filePath: string;
  checksum: string;
  size: number;
}

export interface SnapshotMetadata {
  id: SnapshotId;
  ligaId: number;
  saisonId: number;
  createdAt: Date;
  description: string;
  createdBy?: string;
  size: number;
  entryCount: number;
}

export interface SnapshotConfiguration {
  storageDirectory: string;
  maxSnapshots: number;
  maxAge: number; // in days
  compressionEnabled: boolean;
  checksumEnabled: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredEntries: number;
  errors: RestoreError[];
  timestamp: Date;
}

export interface RestoreError {
  type: RestoreErrorType;
  message: string;
  details: any;
  timestamp: Date;
}

export enum RestoreErrorType {
  SNAPSHOT_NOT_FOUND = 'snapshot_not_found',
  CORRUPTED_SNAPSHOT = 'corrupted_snapshot',
  DATABASE_ERROR = 'database_error',
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_ERROR = 'permission_error'
}

export type SnapshotId = string;

// Re-export from tabellen-berechnung for consistency
export interface TabellenEintrag {
  id?: number;
  team_name: string;
  liga: Liga;
  team: Team;
  team_logo?: any;
  platz: number;
  spiele: number;
  siege: number;
  unentschieden: number;
  niederlagen: number;
  tore_fuer: number;
  tore_gegen: number;
  tordifferenz: number;
  punkte: number;
  last_updated?: Date;
  auto_calculated?: boolean;
  calculation_source?: string;
}

export interface Liga {
  id: number;
  name: string;
}

export interface Team {
  id: number;
  name: string;
  logo?: any;
}

/**
 * Implementation of the SnapshotService
 * Provides functionality to create, store, and restore table snapshots
 */
export class SnapshotServiceImpl implements SnapshotService {
  private config: SnapshotConfiguration;
  private strapi: any;

  constructor(strapi: any, config?: Partial<SnapshotConfiguration>) {
    this.strapi = strapi;
    this.config = {
      storageDirectory: config?.storageDirectory || DEFAULT_AUTOMATION_CONFIG.snapshot.storageDirectory,
      maxSnapshots: config?.maxSnapshots || DEFAULT_AUTOMATION_CONFIG.snapshot.maxSnapshots,
      maxAge: config?.maxAge || DEFAULT_AUTOMATION_CONFIG.snapshot.maxAge,
      compressionEnabled: config?.compressionEnabled ?? DEFAULT_AUTOMATION_CONFIG.snapshot.compression,
      checksumEnabled: config?.checksumEnabled ?? DEFAULT_AUTOMATION_CONFIG.snapshot.checksumValidation
    };
    
    this.ensureStorageDirectory();
  }

  /**
   * Creates a snapshot of the current table data for a specific liga and saison
   */
  async createSnapshot(ligaId: number, saisonId: number, description?: string): Promise<SnapshotId> {
    try {
      // Generate unique snapshot ID
      const snapshotId = this.generateSnapshotId(ligaId, saisonId);
      
      // Fetch current table data
      const tableData = await this.fetchTableData(ligaId, saisonId);
      
      // Create snapshot object
      const snapshot: Snapshot = {
        id: snapshotId,
        ligaId,
        saisonId,
        data: tableData,
        createdAt: new Date(),
        description: description || `Automatic snapshot for Liga ${ligaId}, Saison ${saisonId}`,
        filePath: this.getSnapshotFilePath(snapshotId),
        checksum: '',
        size: 0
      };

      // Serialize and optionally compress data
      let serializedData = await this.serializeSnapshot(snapshot);
      
      // Calculate checksum if enabled
      if (this.config.checksumEnabled) {
        snapshot.checksum = this.calculateChecksum(serializedData);
        // Re-serialize with the checksum included
        serializedData = await this.serializeSnapshot(snapshot);
      }
      
      snapshot.size = serializedData.length;

      // Write to file
      await fs.writeFile(snapshot.filePath, serializedData);
      
      // Log snapshot creation
      this.strapi.log.info(`Snapshot created: ${snapshotId} for Liga ${ligaId}, Saison ${saisonId}`);
      
      // Clean up old snapshots if needed
      await this.cleanupOldSnapshots(ligaId, saisonId);
      
      return snapshotId;
    } catch (error) {
      this.strapi.log.error('Failed to create snapshot:', error);
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }
  }

  /**
   * Restores a table from a snapshot with comprehensive validation and logging
   */
  async restoreSnapshot(snapshotId: SnapshotId): Promise<RestoreResult> {
    const startTime = new Date();
    const errors: RestoreError[] = [];
    let restoredEntries = 0;

    try {
      // Load snapshot
      const snapshot = await this.getSnapshot(snapshotId);
      if (!snapshot) {
        const error: RestoreError = {
          type: RestoreErrorType.SNAPSHOT_NOT_FOUND,
          message: `Snapshot not found: ${snapshotId}`,
          details: { snapshotId },
          timestamp: new Date()
        };
        errors.push(error);
        return {
          success: false,
          restoredEntries: 0,
          errors,
          timestamp: startTime
        };
      }

      // Validate snapshot integrity
      try {
        await this.validateSnapshot(snapshot);
      } catch (validationError) {
        const error: RestoreError = {
          type: RestoreErrorType.VALIDATION_ERROR,
          message: `Snapshot validation failed: ${validationError.message}`,
          details: { snapshotId, validationError: validationError.message },
          timestamp: new Date()
        };
        errors.push(error);
        return {
          success: false,
          restoredEntries: 0,
          errors,
          timestamp: startTime
        };
      }

      // Create backup snapshot before restore (only if not already a backup)
      let backupSnapshotId: string | null = null;
      // Skip backup creation in test environment or if already a backup
      if (!snapshot.description.includes('Pre-restore backup') && process.env.NODE_ENV !== 'test') {
        try {
          backupSnapshotId = await this.createSnapshot(
            snapshot.ligaId,
            snapshot.saisonId,
            `Pre-restore backup before ${snapshotId}`
          );
        } catch (backupError) {
          this.strapi.log.warn(`Failed to create backup before restore: ${backupError.message}`);
          // Don't fail the restore if backup fails
        }
      }

      // Start database transaction
      await this.strapi.db.transaction(async (trx: any) => {
        try {
          // Delete existing table entries
          await this.strapi.db.query('api::tabellen-eintrag.tabellen-eintrag').deleteMany({
            where: {
              liga: { id: snapshot.ligaId }
            }
          }, { transacting: trx });

          // Restore snapshot data
          for (const entry of snapshot.data) {
            try {
              const { id, ...entryData } = entry; // Remove ID to let Strapi generate new ones
              await this.strapi.db.query('api::tabellen-eintrag.tabellen-eintrag').create({
                data: {
                  ...entryData,
                  liga: snapshot.ligaId,
                  team: entry.team.id,
                  last_updated: new Date(),
                  auto_calculated: false,
                  calculation_source: `snapshot_restore_${snapshotId}`
                }
              }, { transacting: trx });
              
              restoredEntries++;
            } catch (entryError) {
              const error: RestoreError = {
                type: RestoreErrorType.DATABASE_ERROR,
                message: `Failed to restore entry for team ${entry.team_name}: ${entryError.message}`,
                details: { entry, error: entryError.message },
                timestamp: new Date()
              };
              errors.push(error);
            }
          }
        } catch (transactionError) {
          const error: RestoreError = {
            type: RestoreErrorType.DATABASE_ERROR,
            message: `Transaction failed: ${transactionError.message}`,
            details: { error: transactionError.message },
            timestamp: new Date()
          };
          errors.push(error);
          throw transactionError;
        }
      });

      const backupMessage = backupSnapshotId ? ` Backup created: ${backupSnapshotId}` : '';
      this.strapi.log.info(`Snapshot restored: ${snapshotId} for Liga ${snapshot.ligaId}. Restored ${restoredEntries} entries.${backupMessage}`);
      
      return {
        success: errors.length === 0,
        restoredEntries,
        errors,
        timestamp: startTime
      };

    } catch (error) {
      this.strapi.log.error('Failed to restore snapshot:', error);
      
      // Determine error type based on error message or type
      let errorType = RestoreErrorType.DATABASE_ERROR;
      if (error.message.includes('Snapshot validation failed') || error.message.includes('Invalid snapshot')) {
        errorType = RestoreErrorType.VALIDATION_ERROR;
      } else if (error.message.includes('Snapshot not found')) {
        errorType = RestoreErrorType.SNAPSHOT_NOT_FOUND;
      } else if (error.message.includes('corrupted') || error.message.includes('checksum')) {
        errorType = RestoreErrorType.CORRUPTED_SNAPSHOT;
      }
      
      const restoreError: RestoreError = {
        type: errorType,
        message: `Failed to restore snapshot: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date()
      };
      errors.push(restoreError);
      
      return {
        success: false,
        restoredEntries,
        errors,
        timestamp: startTime
      };
    }
  }

  /**
   * Lists all snapshots for a specific liga and saison
   */
  async listSnapshots(ligaId: number, saisonId: number): Promise<Snapshot[]> {
    try {
      const snapshots: Snapshot[] = [];
      const files = await fs.readdir(this.config.storageDirectory);
      
      for (const file of files) {
        if (file.startsWith(`snapshot_${ligaId}_${saisonId}_`) && file.endsWith('.json')) {
          const snapshotId = file.replace('.json', '');
          const snapshot = await this.getSnapshot(snapshotId);
          if (snapshot) {
            snapshots.push(snapshot);
          }
        }
      }
      
      // Sort by creation date (newest first)
      return snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      this.strapi.log.error('Failed to list snapshots:', error);
      return [];
    }
  }

  /**
   * Gets snapshot metadata without loading full data (for listing purposes)
   */
  async getSnapshotMetadata(snapshotId: SnapshotId): Promise<SnapshotMetadata | null> {
    try {
      const snapshot = await this.getSnapshot(snapshotId);
      if (!snapshot) {
        return null;
      }

      // Calculate actual file size
      let actualSize = snapshot.size;
      try {
        const filePath = this.getSnapshotFilePath(snapshotId);
        const stats = await fs.stat(filePath);
        actualSize = stats.size;
      } catch (statError) {
        // Use stored size if file stat fails
      }

      return {
        id: snapshot.id,
        ligaId: snapshot.ligaId,
        saisonId: snapshot.saisonId,
        createdAt: snapshot.createdAt,
        description: snapshot.description,
        createdBy: snapshot.createdBy,
        size: actualSize,
        entryCount: snapshot.data.length
      };
    } catch (error) {
      this.strapi.log.error('Failed to get snapshot metadata:', error);
      return null;
    }
  }

  /**
   * Lists snapshot metadata for a specific liga and saison (lighter than full snapshots)
   */
  async listSnapshotMetadata(ligaId: number, saisonId: number): Promise<SnapshotMetadata[]> {
    try {
      const metadata: SnapshotMetadata[] = [];
      const files = await fs.readdir(this.config.storageDirectory);
      
      for (const file of files) {
        if (file.startsWith(`snapshot_${ligaId}_${saisonId}_`) && file.endsWith('.json')) {
          const snapshotId = file.replace('.json', '');
          const meta = await this.getSnapshotMetadata(snapshotId);
          if (meta) {
            metadata.push(meta);
          }
        }
      }
      
      // Sort by creation date (newest first)
      return metadata.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      this.strapi.log.error('Failed to list snapshot metadata:', error);
      return [];
    }
  }

  /**
   * Deletes a specific snapshot
   */
  async deleteSnapshot(snapshotId: SnapshotId): Promise<void> {
    try {
      const filePath = this.getSnapshotFilePath(snapshotId);
      await fs.unlink(filePath);
      this.strapi.log.info(`Snapshot deleted: ${snapshotId}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.strapi.log.error('Failed to delete snapshot:', error);
        throw new Error(`Failed to delete snapshot: ${error.message}`);
      }
    }
  }

  /**
   * Deletes snapshots older than maxAge days
   */
  async deleteOldSnapshots(maxAge: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);
      
      const files = await fs.readdir(this.config.storageDirectory);
      
      for (const file of files) {
        if (file.startsWith('snapshot_') && file.endsWith('.json')) {
          const filePath = path.join(this.config.storageDirectory, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            this.strapi.log.info(`Old snapshot deleted: ${file}`);
          }
        }
      }
    } catch (error) {
      this.strapi.log.error('Failed to cleanup old snapshots:', error);
    }
  }

  /**
   * Gets a specific snapshot by ID
   */
  async getSnapshot(snapshotId: SnapshotId): Promise<Snapshot | null> {
    try {
      const filePath = this.getSnapshotFilePath(snapshotId);
      const data = await fs.readFile(filePath);
      
      const snapshot = await this.deserializeSnapshot(data);
      
      // Basic validation during retrieval
      if (!snapshot.data || !Array.isArray(snapshot.data)) {
        throw new Error(`Invalid snapshot data structure: ${snapshot.id}`);
      }
      
      // Validate required fields in table entries
      for (const entry of snapshot.data) {
        if (!entry.team_name || typeof entry.platz !== 'number' || typeof entry.punkte !== 'number') {
          throw new Error(`Invalid table entry in snapshot: ${snapshot.id}`);
        }
      }
      
      return snapshot;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      // For JSON parsing errors or validation errors, still throw
      if (error.message.includes('Invalid snapshot') || error.message.includes('Unexpected token')) {
        throw error;
      }
      this.strapi.log.error('Failed to get snapshot:', error);
      throw new Error(`Failed to get snapshot: ${error.message}`);
    }
  }

  /**
   * Private helper methods
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storageDirectory, { recursive: true });
    } catch (error) {
      this.strapi.log.error('Failed to create storage directory:', error);
    }
  }

  private generateSnapshotId(ligaId: number, saisonId: number): SnapshotId {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `snapshot_${ligaId}_${saisonId}_${timestamp}_${random}`;
  }

  private getSnapshotFilePath(snapshotId: SnapshotId): string {
    return path.join(this.config.storageDirectory, `${snapshotId}.json`);
  }

  private async fetchTableData(ligaId: number, saisonId: number): Promise<TabellenEintrag[]> {
    const entries = await this.strapi.db.query('api::tabellen-eintrag.tabellen-eintrag').findMany({
      where: {
        liga: { id: ligaId }
        // Add saison filter if relation exists
      },
      populate: {
        liga: true,
        team: true,
        team_logo: true
      },
      orderBy: { platz: 'asc' }
    });

    return entries.map((entry: any) => ({
      id: entry.id,
      team_name: entry.team_name,
      liga: {
        id: entry.liga.id,
        name: entry.liga.name
      },
      team: {
        id: entry.team.id,
        name: entry.team.name,
        logo: entry.team.logo
      },
      team_logo: entry.team_logo,
      platz: entry.platz,
      spiele: entry.spiele,
      siege: entry.siege,
      unentschieden: entry.unentschieden,
      niederlagen: entry.niederlagen,
      tore_fuer: entry.tore_fuer,
      tore_gegen: entry.tore_gegen,
      tordifferenz: entry.tordifferenz,
      punkte: entry.punkte,
      last_updated: entry.last_updated,
      auto_calculated: entry.auto_calculated,
      calculation_source: entry.calculation_source
    }));
  }

  private async serializeSnapshot(snapshot: Snapshot): Promise<Buffer> {
    const jsonData = JSON.stringify(snapshot, null, 2);
    const buffer = Buffer.from(jsonData, 'utf8');
    
    if (this.config.compressionEnabled) {
      return await gzip(buffer);
    }
    
    return buffer;
  }

  private async deserializeSnapshot(data: Buffer): Promise<Snapshot> {
    let jsonData: string;
    
    if (this.config.compressionEnabled) {
      const decompressed = await gunzip(data);
      jsonData = decompressed.toString('utf8');
    } else {
      jsonData = data.toString('utf8');
    }
    
    const snapshot = JSON.parse(jsonData);
    
    // Convert date strings back to Date objects
    snapshot.createdAt = new Date(snapshot.createdAt);
    
    return snapshot;
  }

  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async validateSnapshot(snapshot: Snapshot): Promise<void> {
    if (this.config.checksumEnabled && snapshot.checksum) {
      const filePath = snapshot.filePath;
      const data = await fs.readFile(filePath);
      const calculatedChecksum = this.calculateChecksum(data);
      
      if (calculatedChecksum !== snapshot.checksum) {
        throw new Error(`Snapshot checksum validation failed: ${snapshot.id}`);
      }
    }
    
    // Validate snapshot data structure
    if (!snapshot.data || !Array.isArray(snapshot.data)) {
      throw new Error(`Invalid snapshot data structure: ${snapshot.id}`);
    }
    
    // Validate required fields
    for (const entry of snapshot.data) {
      if (!entry.team_name || typeof entry.platz !== 'number' || typeof entry.punkte !== 'number') {
        throw new Error(`Invalid table entry in snapshot: ${snapshot.id}`);
      }
    }
  }

  private async cleanupOldSnapshots(ligaId: number, saisonId: number): Promise<void> {
    if (!this.config.maxSnapshots) return;
    
    const snapshots = await this.listSnapshots(ligaId, saisonId);
    
    if (snapshots.length > this.config.maxSnapshots) {
      const snapshotsToDelete = snapshots.slice(this.config.maxSnapshots);
      
      for (const snapshot of snapshotsToDelete) {
        await this.deleteSnapshot(snapshot.id);
      }
    }
  }
}