#!/usr/bin/env node

/**
 * Comprehensive Data Consistency Analysis Script
 * 
 * This script analyzes all content type schemas and identifies:
 * 1. Duplicate content type concepts
 * 2. Broken bidirectional relations
 * 3. Inconsistent relation mappings
 * 4. Missing or orphaned schema files
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

const fs = require('fs');
const path = require('path');

class DataConsistencyAnalyzer {
  constructor() {
    this.apiPath = path.join(__dirname, '../src/api');
    this.issues = {
      duplicateSchemas: [],
      brokenRelations: [],
      orphanedDirectories: [],
      inconsistentMappings: [],
      missingInverseRelations: []
    };
    this.schemas = new Map();
    this.relationMap = new Map();
  }

  /**
   * Main analysis entry point
   */
  async analyze() {
    console.log('🔍 Starting comprehensive data consistency analysis...\n');
    
    // Step 1: Scan all content type schemas
    await this.scanContentTypeSchemas();
    
    // Step 2: Identify duplicate concepts
    this.identifyDuplicateConcepts();
    
    // Step 3: Analyze relations and mappings
    this.analyzeRelations();
    
    // Step 4: Check for orphaned directories
    this.checkOrphanedDirectories();
    
    // Step 5: Generate comprehensive report
    this.generateReport();
    
    return this.issues;
  }

  /**
   * Scan all API directories for content type schemas
   */
  async scanContentTypeSchemas() {
    console.log('📂 Scanning content type schemas...');
    
    if (!fs.existsSync(this.apiPath)) {
      console.error(`❌ API path not found: ${this.apiPath}`);
      return;
    }

    const apiDirs = fs.readdirSync(this.apiPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const apiDir of apiDirs) {
      const contentTypesPath = path.join(this.apiPath, apiDir, 'content-types');
      
      if (fs.existsSync(contentTypesPath)) {
        const contentTypes = fs.readdirSync(contentTypesPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const contentType of contentTypes) {
          const schemaPath = path.join(contentTypesPath, contentType, 'schema.json');
          
          if (fs.existsSync(schemaPath)) {
            try {
              const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
              const key = `api::${apiDir}.${contentType}`;
              
              this.schemas.set(key, {
                path: schemaPath,
                content: schemaContent,
                apiDir,
                contentType
              });
              
              console.log(`  ✅ Loaded: ${key}`);
            } catch (error) {
              console.error(`  ❌ Failed to parse schema: ${schemaPath}`, error.message);
            }
          } else {
            // Directory exists but no schema file
            this.issues.orphanedDirectories.push({
              path: path.join(contentTypesPath, contentType),
              apiDir,
              contentType,
              reason: 'Directory exists but schema.json is missing'
            });
            console.log(`  ⚠️  Orphaned directory: ${apiDir}/${contentType} (no schema.json)`);
          }
        }
      }
    }
    
    console.log(`\n📊 Found ${this.schemas.size} valid schemas\n`);
  }

  /**
   * Identify duplicate content type concepts based on similar attributes and purposes
   */
  identifyDuplicateConcepts() {
    console.log('🔍 Analyzing duplicate concepts...');
    
    const schemaArray = Array.from(this.schemas.entries());
    const duplicateGroups = [];
    
    // Define known duplicate patterns
    const duplicatePatterns = [
      {
        name: 'Team/Mannschaft Duplication',
        schemas: ['api::team.team', 'api::mannschaft.mannschaft'],
        reason: 'Both represent team entities with similar attributes'
      },
      {
        name: 'Player Statistics Duplication',
        schemas: ['api::spielerstatistik.spielerstatistik'],
        potentialDuplicates: ['spieler-statistik', 'spieler-saison-statistik'],
        reason: 'Multiple player statistics concepts detected'
      }
    ];

    // Check for known duplicates
    for (const pattern of duplicatePatterns) {
      const foundSchemas = pattern.schemas.filter(schema => this.schemas.has(schema));
      
      if (foundSchemas.length > 0) {
        const duplicateInfo = {
          group: pattern.name,
          reason: pattern.reason,
          schemas: foundSchemas.map(schema => ({
            key: schema,
            ...this.schemas.get(schema)
          })),
          potentialOrphans: pattern.potentialDuplicates || []
        };
        
        this.issues.duplicateSchemas.push(duplicateInfo);
        console.log(`  ⚠️  ${pattern.name}: ${foundSchemas.join(', ')}`);
      }
    }

    // Analyze attribute similarity for potential duplicates
    for (let i = 0; i < schemaArray.length; i++) {
      for (let j = i + 1; j < schemaArray.length; j++) {
        const [key1, schema1] = schemaArray[i];
        const [key2, schema2] = schemaArray[j];
        
        const similarity = this.calculateAttributeSimilarity(
          schema1.content.attributes,
          schema2.content.attributes
        );
        
        if (similarity > 0.7) { // 70% similarity threshold
          console.log(`  🔍 High similarity detected: ${key1} <-> ${key2} (${Math.round(similarity * 100)}%)`);
        }
      }
    }
    
    console.log('');
  }

  /**
   * Calculate attribute similarity between two schemas
   */
  calculateAttributeSimilarity(attrs1, attrs2) {
    const keys1 = new Set(Object.keys(attrs1 || {}));
    const keys2 = new Set(Object.keys(attrs2 || {}));
    
    const intersection = new Set([...keys1].filter(x => keys2.has(x)));
    const union = new Set([...keys1, ...keys2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Analyze all relations and their bidirectional mappings
   */
  analyzeRelations() {
    console.log('🔗 Analyzing relations and mappings...');
    
    // Build relation map
    for (const [schemaKey, schemaData] of this.schemas) {
      const attributes = schemaData.content.attributes || {};
      
      for (const [attrName, attrConfig] of Object.entries(attributes)) {
        if (attrConfig.type === 'relation') {
          const relationInfo = {
            sourceSchema: schemaKey,
            sourceAttribute: attrName,
            targetSchema: attrConfig.target,
            relationType: attrConfig.relation,
            inversedBy: attrConfig.inversedBy,
            mappedBy: attrConfig.mappedBy
          };
          
          if (!this.relationMap.has(schemaKey)) {
            this.relationMap.set(schemaKey, []);
          }
          this.relationMap.get(schemaKey).push(relationInfo);
        }
      }
    }

    // Check for broken bidirectional relations
    this.checkBidirectionalRelations();
    
    // Check for inconsistent mappings
    this.checkInconsistentMappings();
    
    console.log('');
  }

  /**
   * Check for broken bidirectional relations
   */
  checkBidirectionalRelations() {
    console.log('  🔍 Checking bidirectional relations...');
    
    for (const [schemaKey, relations] of this.relationMap) {
      for (const relation of relations) {
        if (relation.inversedBy) {
          // Check if target schema exists and has the inverse relation
          const targetSchema = this.schemas.get(relation.targetSchema);
          if (!targetSchema) {
            this.issues.brokenRelations.push({
              type: 'missing_target_schema',
              source: relation.sourceSchema,
              sourceAttribute: relation.sourceAttribute,
              targetSchema: relation.targetSchema,
              reason: 'Target schema does not exist'
            });
            continue;
          }

          const targetAttributes = targetSchema.content.attributes || {};
          const inverseAttribute = targetAttributes[relation.inversedBy];
          
          if (!inverseAttribute) {
            this.issues.brokenRelations.push({
              type: 'missing_inverse_attribute',
              source: relation.sourceSchema,
              sourceAttribute: relation.sourceAttribute,
              target: relation.targetSchema,
              expectedInverse: relation.inversedBy,
              reason: `Inverse attribute '${relation.inversedBy}' not found in target schema`
            });
          } else if (inverseAttribute.target !== relation.sourceSchema) {
            this.issues.brokenRelations.push({
              type: 'incorrect_inverse_target',
              source: relation.sourceSchema,
              sourceAttribute: relation.sourceAttribute,
              target: relation.targetSchema,
              inverseAttribute: relation.inversedBy,
              expectedTarget: relation.sourceSchema,
              actualTarget: inverseAttribute.target,
              reason: 'Inverse relation points to wrong schema'
            });
          }
        }

        if (relation.mappedBy) {
          // Similar check for mappedBy relations
          const targetSchema = this.schemas.get(relation.targetSchema);
          if (targetSchema) {
            const targetAttributes = targetSchema.content.attributes || {};
            const mappedAttribute = targetAttributes[relation.mappedBy];
            
            if (!mappedAttribute) {
              this.issues.brokenRelations.push({
                type: 'missing_mapped_attribute',
                source: relation.sourceSchema,
                sourceAttribute: relation.sourceAttribute,
                target: relation.targetSchema,
                expectedMapped: relation.mappedBy,
                reason: `Mapped attribute '${relation.mappedBy}' not found in target schema`
              });
            }
          }
        }
      }
    }
  }

  /**
   * Check for inconsistent relation mappings
   */
  checkInconsistentMappings() {
    console.log('  🔍 Checking for inconsistent mappings...');
    
    // Look for entities that have relations to both team and mannschaft
    const problematicRelations = [];
    
    for (const [schemaKey, relations] of this.relationMap) {
      const teamRelations = relations.filter(r => 
        r.targetSchema === 'api::team.team' || r.targetSchema === 'api::mannschaft.mannschaft'
      );
      
      if (teamRelations.length > 1) {
        problematicRelations.push({
          schema: schemaKey,
          relations: teamRelations,
          reason: 'Schema has relations to both team and mannschaft concepts'
        });
      }
    }

    this.issues.inconsistentMappings.push(...problematicRelations);
    
    // Check for similar issues with other duplicate concepts
    for (const duplicate of this.issues.duplicateSchemas) {
      for (const [schemaKey, relations] of this.relationMap) {
        const duplicateRelations = relations.filter(r => 
          duplicate.schemas.some(s => s.key === r.targetSchema)
        );
        
        if (duplicateRelations.length > 1) {
          this.issues.inconsistentMappings.push({
            schema: schemaKey,
            relations: duplicateRelations,
            reason: `Schema has relations to multiple schemas in duplicate group: ${duplicate.group}`
          });
        }
      }
    }
  }

  /**
   * Check for orphaned directories (directories without schemas)
   */
  checkOrphanedDirectories() {
    console.log('📁 Checking for orphaned directories...');
    
    // This was already done in scanContentTypeSchemas, but let's add more analysis
    for (const orphan of this.issues.orphanedDirectories) {
      console.log(`  ⚠️  ${orphan.apiDir}/${orphan.contentType}: ${orphan.reason}`);
    }
    
    console.log('');
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('📋 Generating comprehensive report...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSchemas: this.schemas.size,
        duplicateGroups: this.issues.duplicateSchemas.length,
        brokenRelations: this.issues.brokenRelations.length,
        orphanedDirectories: this.issues.orphanedDirectories.length,
        inconsistentMappings: this.issues.inconsistentMappings.length
      },
      details: this.issues,
      recommendations: this.generateRecommendations()
    };

    // Write report to file
    const reportPath = path.join(__dirname, '../docs/data-consistency-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable report
    this.generateHumanReadableReport(report);
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    console.log(`📄 Human-readable report saved to: ${reportPath.replace('.json', '.md')}`);
  }

  /**
   * Generate recommendations based on found issues
   */
  generateRecommendations() {
    const recommendations = [];

    // Duplicate schema recommendations
    for (const duplicate of this.issues.duplicateSchemas) {
      if (duplicate.group === 'Team/Mannschaft Duplication') {
        recommendations.push({
          priority: 'HIGH',
          category: 'Schema Consolidation',
          issue: 'Team/Mannschaft duplication',
          recommendation: 'Consolidate team and mannschaft into a single content type. Migrate all relations and data to the chosen schema.',
          affectedSchemas: duplicate.schemas.map(s => s.key),
          estimatedEffort: 'Medium'
        });
      }
    }

    // Broken relation recommendations
    if (this.issues.brokenRelations.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Relation Integrity',
        issue: 'Broken bidirectional relations',
        recommendation: 'Fix all broken bidirectional relations by ensuring inverse attributes exist and point to correct schemas.',
        affectedRelations: this.issues.brokenRelations.length,
        estimatedEffort: 'High'
      });
    }

    // Orphaned directory recommendations
    if (this.issues.orphanedDirectories.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Code Cleanup',
        issue: 'Orphaned directories',
        recommendation: 'Remove orphaned directories or create proper schema files if they are needed.',
        affectedDirectories: this.issues.orphanedDirectories.map(o => `${o.apiDir}/${o.contentType}`),
        estimatedEffort: 'Low'
      });
    }

    return recommendations;
  }

  /**
   * Generate human-readable markdown report
   */
  generateHumanReadableReport(report) {
    const lines = [];
    
    lines.push('# Data Consistency Analysis Report');
    lines.push('');
    lines.push(`**Generated:** ${report.timestamp}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Schemas:** ${report.summary.totalSchemas}`);
    lines.push(`- **Duplicate Groups:** ${report.summary.duplicateGroups}`);
    lines.push(`- **Broken Relations:** ${report.summary.brokenRelations}`);
    lines.push(`- **Orphaned Directories:** ${report.summary.orphanedDirectories}`);
    lines.push(`- **Inconsistent Mappings:** ${report.summary.inconsistentMappings}`);
    lines.push('');

    // Issues
    if (report.details.duplicateSchemas.length > 0) {
      lines.push('## Duplicate Schema Issues');
      lines.push('');
      for (const duplicate of report.details.duplicateSchemas) {
        lines.push(`### ${duplicate.group}`);
        lines.push(`**Reason:** ${duplicate.reason}`);
        lines.push('**Affected Schemas:**');
        for (const schema of duplicate.schemas) {
          lines.push(`- ${schema.key} (${schema.path})`);
        }
        if (duplicate.potentialOrphans.length > 0) {
          lines.push('**Potential Orphaned Directories:**');
          for (const orphan of duplicate.potentialOrphans) {
            lines.push(`- ${orphan}`);
          }
        }
        lines.push('');
      }
    }

    if (report.details.brokenRelations.length > 0) {
      lines.push('## Broken Relations');
      lines.push('');
      for (const relation of report.details.brokenRelations) {
        lines.push(`### ${relation.type}`);
        lines.push(`**Source:** ${relation.source}`);
        lines.push(`**Reason:** ${relation.reason}`);
        lines.push('');
      }
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');
      for (const rec of report.recommendations) {
        lines.push(`### ${rec.category} (${rec.priority} Priority)`);
        lines.push(`**Issue:** ${rec.issue}`);
        lines.push(`**Recommendation:** ${rec.recommendation}`);
        lines.push(`**Estimated Effort:** ${rec.estimatedEffort}`);
        lines.push('');
      }
    }

    const reportPath = path.join(__dirname, '../docs/data-consistency-analysis-report.md');
    fs.writeFileSync(reportPath, lines.join('\n'));
  }
}

// Main execution
if (require.main === module) {
  const analyzer = new DataConsistencyAnalyzer();
  analyzer.analyze()
    .then((issues) => {
      console.log('\n✅ Analysis complete!');
      console.log('\n📊 Issues Summary:');
      console.log(`   - Duplicate schemas: ${issues.duplicateSchemas.length}`);
      console.log(`   - Broken relations: ${issues.brokenRelations.length}`);
      console.log(`   - Orphaned directories: ${issues.orphanedDirectories.length}`);
      console.log(`   - Inconsistent mappings: ${issues.inconsistentMappings.length}`);
      
      if (Object.values(issues).some(arr => arr.length > 0)) {
        console.log('\n⚠️  Issues found! Check the generated reports for details.');
        process.exit(1);
      } else {
        console.log('\n🎉 No issues found!');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = DataConsistencyAnalyzer;