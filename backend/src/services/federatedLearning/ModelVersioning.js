const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class ModelVersioning {
  constructor(options = {}) {
    this.config = {
      maxVersions: options.maxVersions || 50,
      enableCompression: options.enableCompression || true,
      enableEncryption: options.enableEncryption || false,
      backupInterval: options.backupInterval || 3600000, // 1 hour
      retentionDays: options.retentionDays || 30,
      ...options
    };

    this.versions = new Map();
    this.activeVersion = null;
    this.versionHistory = [];
    this.rollbackHistory = [];
    this.backupTimer = null;

    if (this.config.backupInterval > 0) {
      this._startBackupTimer();
    }
  }

  /**
   * Initialize model versioning system
   */
  async initialize() {
    logger.info('Model versioning system initialized');
    return true;
  }

  /**
   * Create a new model version
   */
  async createVersion(modelData, metadata = {}) {
    const versionId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Calculate version hash
    const modelHash = this._calculateModelHash(modelData);
    
    // Check if this version already exists
    const existingVersion = this._findVersionByHash(modelHash);
    if (existingVersion) {
      logger.warn(`Model version already exists: ${existingVersion.id}`);
      return existingVersion;
    }

    const version = {
      id: versionId,
      versionNumber: this._getNextVersionNumber(),
      timestamp,
      modelHash,
      modelData: this.config.enableCompression ? 
        this._compressModel(modelData) : modelData,
      metadata: {
        description: metadata.description || '',
        author: metadata.author || 'system',
        tags: metadata.tags || [],
        accuracy: metadata.accuracy || 0,
        loss: metadata.loss || 0,
        trainingRounds: metadata.trainingRounds || 0,
        participantCount: metadata.participantCount || 0,
        privacyBudgetSpent: metadata.privacyBudgetSpent || 0,
        fairnessScore: metadata.fairnessScore || 0,
        modelSize: this._calculateModelSize(modelData),
        ...metadata
      },
      status: 'active',
      parentVersion: metadata.parentVersion || this.activeVersion?.id,
      children: [],
      rollbackCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Update parent version children
    if (version.parentVersion) {
      const parent = this.versions.get(version.parentVersion);
      if (parent) {
        parent.children.push(versionId);
        parent.updatedAt = timestamp;
      }
    }

    // Store version
    this.versions.set(versionId, version);
    this.activeVersion = version;
    this.versionHistory.push(version);

    // Clean up old versions if needed
    await this._cleanupOldVersions();

    logger.info(`Created model version ${version.versionNumber}: ${versionId}`);
    return version;
  }

  /**
   * Get model version by ID
   */
  getVersion(versionId) {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Decompress model data if needed
    if (this.config.enableCompression && typeof version.modelData === 'string') {
      return {
        ...version,
        modelData: this._decompressModel(version.modelData)
      };
    }

    return version;
  }

  /**
   * Get active model version
   */
  getActiveVersion() {
    if (!this.activeVersion) {
      throw new Error('No active version found');
    }

    return this.getVersion(this.activeVersion.id);
  }

  /**
   * List all versions with filtering options
   */
  listVersions(options = {}) {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      status,
      author,
      tags,
      dateRange
    } = options;

    let versions = Array.from(this.versions.values());

    // Apply filters
    if (status) {
      versions = versions.filter(v => v.status === status);
    }
    if (author) {
      versions = versions.filter(v => v.metadata.author === author);
    }
    if (tags && tags.length > 0) {
      versions = versions.filter(v => 
        tags.some(tag => v.metadata.tags.includes(tag))
      );
    }
    if (dateRange) {
      const { start, end } = dateRange;
      versions = versions.filter(v => {
        const timestamp = new Date(v.timestamp);
        return timestamp >= new Date(start) && timestamp <= new Date(end);
      });
    }

    // Sort versions
    versions.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const paginatedVersions = versions.slice(offset, offset + limit);

    return {
      versions: paginatedVersions,
      total: versions.length,
      offset,
      limit
    };
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(versionId, options = {}) {
    const targetVersion = this.getVersion(versionId);
    const currentActive = this.getActiveVersion();

    // Validate rollback
    if (targetVersion.id === currentActive.id) {
      throw new Error('Cannot rollback to the current active version');
    }

    const rollbackReason = options.reason || 'Manual rollback';
    const timestamp = new Date().toISOString();

    // Create rollback record
    const rollbackRecord = {
      id: uuidv4(),
      timestamp,
      fromVersion: currentActive.id,
      toVersion: targetVersion.id,
      reason: rollbackReason,
      performedBy: options.performedBy || 'system',
      metadata: {
        previousAccuracy: currentActive.metadata.accuracy,
        newAccuracy: targetVersion.metadata.accuracy,
        accuracyDelta: targetVersion.metadata.accuracy - currentActive.metadata.accuracy
      }
    };

    // Update version statuses
    currentActive.status = 'rollback';
    targetVersion.status = 'active';
    targetVersion.rollbackCount++;
    targetVersion.updatedAt = timestamp;

    // Update active version
    this.activeVersion = targetVersion;

    // Store rollback record
    this.rollbackHistory.push(rollbackRecord);

    logger.info(`Rolled back from version ${currentActive.versionNumber} to ${targetVersion.versionNumber}`);
    this.emit('versionRolledBack', rollbackRecord);

    return rollbackRecord;
  }

  /**
   * Compare two versions
   */
  compareVersions(versionId1, versionId2) {
    const version1 = this.getVersion(versionId1);
    const version2 = this.getVersion(versionId2);

    const comparison = {
      version1: {
        id: version1.id,
        versionNumber: version1.versionNumber,
        timestamp: version1.timestamp,
        metadata: version1.metadata
      },
      version2: {
        id: version2.id,
        versionNumber: version2.versionNumber,
        timestamp: version2.timestamp,
        metadata: version2.metadata
      },
      differences: this._calculateVersionDifferences(version1, version2),
      relationship: this._determineVersionRelationship(version1, version2)
    };

    return comparison;
  }

  /**
   * Delete a version
   */
  async deleteVersion(versionId, force = false) {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Prevent deletion of active version unless forced
    if (version.id === this.activeVersion?.id && !force) {
      throw new Error('Cannot delete active version. Use force=true to override.');
    }

    // Check for dependencies
    if (version.children.length > 0 && !force) {
      throw new Error(`Cannot delete version with ${version.children.length} dependent versions. Use force=true to override.`);
    }

    // Remove from parent's children
    if (version.parentVersion) {
      const parent = this.versions.get(version.parentVersion);
      if (parent) {
        parent.children = parent.children.filter(id => id !== versionId);
      }
    }

    // Update children's parent reference
    for (const childId of version.children) {
      const child = this.versions.get(childId);
      if (child) {
        child.parentVersion = version.parentVersion;
      }
    }

    // Remove from collections
    this.versions.delete(versionId);
    this.versionHistory = this.versionHistory.filter(v => v.id !== versionId);

    // Update active version if necessary
    if (this.activeVersion?.id === versionId) {
      this.activeVersion = this._findLatestVersion() || null;
    }

    logger.info(`Deleted model version ${version.versionNumber}: ${versionId}`);
    return true;
  }

  /**
   * Get version lineage
   */
  getVersionLineage(versionId) {
    const version = this.getVersion(versionId);
    const lineage = {
      ancestors: [],
      descendants: [],
      siblings: []
    };

    // Find ancestors
    let current = version;
    while (current.parentVersion) {
      const parent = this.versions.get(current.parentVersion);
      if (parent) {
        lineage.ancestors.unshift({
          id: parent.id,
          versionNumber: parent.versionNumber,
          timestamp: parent.timestamp
        });
        current = parent;
      } else {
        break;
      }
    }

    // Find descendants
    const findDescendants = (parentId) => {
      const parent = this.versions.get(parentId);
      if (!parent) return;
      
      for (const childId of parent.children) {
        const child = this.versions.get(childId);
        if (child) {
          lineage.descendants.push({
            id: child.id,
            versionNumber: child.versionNumber,
            timestamp: child.timestamp
          });
          findDescendants(childId);
        }
      }
    };

    findDescendants(versionId);

    // Find siblings
    if (version.parentVersion) {
      const parent = this.versions.get(version.parentVersion);
      if (parent) {
        for (const childId of parent.children) {
          if (childId !== versionId) {
            const sibling = this.versions.get(childId);
            if (sibling) {
              lineage.siblings.push({
                id: sibling.id,
                versionNumber: sibling.versionNumber,
                timestamp: sibling.timestamp
              });
            }
          }
        }
      }
    }

    return lineage;
  }

  /**
   * Export version data
   */
  exportVersions(format = 'json', options = {}) {
    const { includeModelData = false, versionIds = null } = options;
    
    let versionsToExport;
    if (versionIds) {
      versionsToExport = versionIds.map(id => this.getVersion(id));
    } else {
      versionsToExport = Array.from(this.versions.values());
    }

    const exportData = {
      exportTimestamp: new Date().toISOString(),
      totalVersions: versionsToExport.length,
      activeVersion: this.activeVersion?.id,
      versions: versionsToExport.map(version => {
        const exportVersion = {
          id: version.id,
          versionNumber: version.versionNumber,
          timestamp: version.timestamp,
          modelHash: version.modelHash,
          metadata: version.metadata,
          status: version.status,
          parentVersion: version.parentVersion,
          children: version.children,
          rollbackCount: version.rollbackCount,
          createdAt: version.createdAt,
          updatedAt: version.updatedAt
        };

        if (includeModelData) {
          exportVersion.modelData = version.modelData;
        }

        return exportVersion;
      }),
      rollbackHistory: this.rollbackHistory
    };

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'csv':
        return this._convertToCSV(exportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import version data
   */
  async importVersions(data, options = {}) {
    const { overwrite = false, validateHashes = true } = options;
    
    try {
      const importData = typeof data === 'string' ? JSON.parse(data) : data;
      
      for (const versionData of importData.versions) {
        // Check if version already exists
        if (this.versions.has(versionData.id) && !overwrite) {
          logger.warn(`Version already exists, skipping: ${versionData.id}`);
          continue;
        }

        // Validate model hash if requested
        if (validateHashes && versionData.modelData) {
          const calculatedHash = this._calculateModelHash(versionData.modelData);
          if (calculatedHash !== versionData.modelHash) {
            logger.error(`Hash mismatch for version ${versionData.id}, skipping import`);
            continue;
          }
        }

        // Import version
        this.versions.set(versionData.id, versionData);
        this.versionHistory.push(versionData);
      }

      // Import rollback history
      if (importData.rollbackHistory) {
        this.rollbackHistory.push(...importData.rollbackHistory);
      }

      // Set active version
      if (importData.activeVersion && this.versions.has(importData.activeVersion)) {
        this.activeVersion = this.versions.get(importData.activeVersion);
      }

      logger.info(`Imported ${importData.versions.length} model versions`);
      return true;

    } catch (error) {
      logger.error('Failed to import versions:', error);
      throw error;
    }
  }

  /**
   * Get version statistics
   */
  getStatistics() {
    const versions = Array.from(this.versions.values());
    
    return {
      totalVersions: versions.length,
      activeVersions: versions.filter(v => v.status === 'active').length,
      rollbackVersions: versions.filter(v => v.status === 'rollback').length,
      averageAccuracy: this._calculateAverage(versions.map(v => v.metadata.accuracy)),
      totalRollbacks: this.rollbackHistory.length,
      averageModelSize: this._calculateAverage(versions.map(v => v.metadata.modelSize)),
      versionFrequency: this._calculateVersionFrequency(),
      topAuthors: this._getTopAuthors(versions),
      storageUsage: this._calculateStorageUsage()
    };
  }

  /**
   * Helper methods
   */
  _calculateModelHash(modelData) {
    const modelString = JSON.stringify(modelData);
    return crypto.createHash('sha256').update(modelString).digest('hex');
  }

  _findVersionByHash(hash) {
    for (const version of this.versions.values()) {
      if (version.modelHash === hash) {
        return version;
      }
    }
    return null;
  }

  _getNextVersionNumber() {
    const versionNumbers = Array.from(this.versions.values()).map(v => v.versionNumber);
    return versionNumbers.length > 0 ? Math.max(...versionNumbers) + 1 : 1;
  }

  _compressModel(modelData) {
    // Simple compression - in production, use proper compression
    return Buffer.from(JSON.stringify(modelData)).toString('base64');
  }

  _decompressModel(compressedData) {
    return JSON.parse(Buffer.from(compressedData, 'base64').toString());
  }

  _calculateModelSize(modelData) {
    return JSON.stringify(modelData).length;
  }

  _cleanupOldVersions() {
    if (this.versions.size <= this.config.maxVersions) {
      return;
    }

    const versions = Array.from(this.versions.values())
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const versionsToDelete = versions.slice(0, this.versions.size - this.config.maxVersions);

    for (const version of versionsToDelete) {
      if (version.id !== this.activeVersion?.id) {
        this.deleteVersion(version.id, true);
      }
    }
  }

  _calculateVersionDifferences(version1, version2) {
    return {
      accuracyDelta: version2.metadata.accuracy - version1.metadata.accuracy,
      lossDelta: version2.metadata.loss - version1.metadata.loss,
      sizeDelta: version2.metadata.modelSize - version1.metadata.modelSize,
      roundsDelta: version2.metadata.trainingRounds - version1.metadata.trainingRounds,
      participantDelta: version2.metadata.participantCount - version1.metadata.participantCount
    };
  }

  _determineVersionRelationship(version1, version2) {
    if (version1.id === version2.id) return 'same';
    if (version1.parentVersion === version2.id) return 'child';
    if (version2.parentVersion === version1.id) return 'parent';
    if (version1.parentVersion === version2.parentVersion) return 'sibling';
    return 'unrelated';
  }

  _findLatestVersion() {
    const versions = Array.from(this.versions.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return versions[0] || null;
  }

  _convertToCSV(data) {
    const headers = ['id', 'versionNumber', 'timestamp', 'status', 'accuracy', 'loss', 'author'];
    const rows = [headers.join(',')];

    for (const version of data.versions) {
      const row = [
        version.id,
        version.versionNumber,
        version.timestamp,
        version.status,
        version.metadata.accuracy,
        version.metadata.loss,
        version.metadata.author
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  _calculateAverage(values) {
    const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    return validValues.length > 0 ? 
      validValues.reduce((sum, v) => sum + v, 0) / validValues.length : 0;
  }

  _calculateVersionFrequency() {
    const versions = Array.from(this.versions.values())
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (versions.length < 2) return 0;

    const timeSpan = new Date(versions[versions.length - 1].timestamp) - 
                    new Date(versions[0].timestamp);
    const days = timeSpan / (1000 * 60 * 60 * 24);

    return days > 0 ? versions.length / days : 0;
  }

  _getTopAuthors(versions) {
    const authorCounts = {};
    for (const version of versions) {
      const author = version.metadata.author || 'unknown';
      authorCounts[author] = (authorCounts[author] || 0) + 1;
    }

    return Object.entries(authorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([author, count]) => ({ author, count }));
  }

  _calculateStorageUsage() {
    let totalSize = 0;
    for (const version of this.versions.values()) {
      totalSize += version.metadata.modelSize || 0;
    }
    return totalSize;
  }

  _startBackupTimer() {
    this.backupTimer = setInterval(() => {
      this._performBackup();
    }, this.config.backupInterval);
  }

  _performBackup() {
    // In production, implement actual backup to persistent storage
    logger.debug('Performing automatic model version backup');
    this.emit('backupPerformed', {
      timestamp: new Date().toISOString(),
      versionCount: this.versions.size
    });
  }

  /**
   * Stop versioning system
   */
  stop() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
    
    logger.info('Model versioning system stopped');
  }
}

module.exports = ModelVersioning;
