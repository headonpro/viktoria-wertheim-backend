#!/usr/bin/env node

/**
 * Schema Validation Checker Script
 * 
 * This script validates the mannschaft schema.json file for:
 * - JSON syntax correctness
 * - Enum definition consistency
 * - Schema compilation issues
 * - Version mismatches between schema and generated types
 * 
 * Requirements: 2.1, 2.4
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SchemaValidationChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.schemaPath = path.join(__dirname, '../src/api/mannschaft/content-types/mannschaft/schema.json');
    this.typesPath = path.join(__dirname, '../types/generated/contentTypes.d.ts');
    this.rootTypesPath = path.join(__dirname, '../../types/generated/contentTypes.d.ts');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [SCHEMA-VALIDATOR]`;
    
    switch (type) {
      case 'error':
        console.log(chalk.red(`${prefix} ERROR: ${message}`));
        this.errors.push(message);
        break;
      case 'warning':
        console.log(chalk.yellow(`${prefix} WARNING: ${message}`));
        this.warnings.push(message);
        break;
      case 'success':
        console.log(chalk.green(`${prefix} SUCCESS: ${message}`));
        break;
      case 'info':
      default:
        console.log(chalk.blue(`${prefix} INFO: ${message}`));
        this.info.push(message);
        break;
    }
  }

  /**
   * Validate JSON syntax of schema file
   */
  validateSchemaJsonSyntax() {
    this.log('Validating schema JSON syntax...');
    
    try {
      if (!fs.existsSync(this.schemaPath)) {
        this.log(`Schema file not found at: ${this.schemaPath}`, 'error');
        return false;
      }

      const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
      const schema = JSON.parse(schemaContent);
      
      this.log('Schema JSON syntax is valid', 'success');
      return schema;
    } catch (error) {
      this.log(`Schema JSON syntax error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Validate enum definitions in schema
   */
  validateEnumDefinitions(schema) {
    this.log('Validating enum definitions...');
    
    const expectedEnums = {
      status: ['aktiv', 'inaktiv', 'aufgeloest'],
      liga: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
      altersklasse: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini'],
      trend: ['steigend', 'gleich', 'fallend']
    };

    let enumsValid = true;

    for (const [fieldName, expectedValues] of Object.entries(expectedEnums)) {
      const field = schema.attributes[fieldName];
      
      if (!field) {
        this.log(`Missing enum field: ${fieldName}`, 'error');
        enumsValid = false;
        continue;
      }

      if (field.type !== 'enumeration') {
        this.log(`Field ${fieldName} is not of type 'enumeration'`, 'error');
        enumsValid = false;
        continue;
      }

      if (!field.enum || !Array.isArray(field.enum)) {
        this.log(`Field ${fieldName} missing or invalid enum array`, 'error');
        enumsValid = false;
        continue;
      }

      // Check if all expected values are present
      const missingValues = expectedValues.filter(val => !field.enum.includes(val));
      const extraValues = field.enum.filter(val => !expectedValues.includes(val));

      if (missingValues.length > 0) {
        this.log(`Field ${fieldName} missing enum values: ${missingValues.join(', ')}`, 'error');
        enumsValid = false;
      }

      if (extraValues.length > 0) {
        this.log(`Field ${fieldName} has unexpected enum values: ${extraValues.join(', ')}`, 'warning');
      }

      if (missingValues.length === 0 && extraValues.length === 0) {
        this.log(`Field ${fieldName} enum values are correct`, 'success');
      }
    }

    return enumsValid;
  }

  /**
   * Validate required field configurations
   */
  validateRequiredFields(schema) {
    this.log('Validating required field configurations...');
    
    const requiredFields = ['name', 'liga', 'status', 'altersklasse', 'trend'];
    let requiredValid = true;

    for (const fieldName of requiredFields) {
      const field = schema.attributes[fieldName];
      
      if (!field) {
        this.log(`Missing required field: ${fieldName}`, 'error');
        requiredValid = false;
        continue;
      }

      if (!field.required && fieldName !== 'trend') { // trend has default value
        this.log(`Field ${fieldName} should be marked as required`, 'warning');
      }

      // Check for custom validation
      if (['liga', 'status', 'altersklasse', 'trend'].includes(fieldName)) {
        if (!field.validate || !field.validate.custom) {
          this.log(`Field ${fieldName} missing custom validation`, 'warning');
        } else if (field.validate.custom !== 'validateEnumNotNull') {
          this.log(`Field ${fieldName} has unexpected custom validation: ${field.validate.custom}`, 'warning');
        }
      }
    }

    if (requiredValid) {
      this.log('Required field configurations are valid', 'success');
    }

    return requiredValid;
  }

  /**
   * Check for schema compilation issues
   */
  checkSchemaCompilation() {
    this.log('Checking schema compilation status...');
    
    try {
      // Check if generated types exist (try both locations)
      let typesPath = this.typesPath;
      if (!fs.existsSync(this.typesPath) && fs.existsSync(this.rootTypesPath)) {
        typesPath = this.rootTypesPath;
        this.log('Using root types directory', 'info');
      } else if (!fs.existsSync(this.typesPath)) {
        this.log(`Generated types file not found at: ${this.typesPath}`, 'error');
        this.log('Run "npm run build" to generate types', 'info');
        return false;
      }

      const typesContent = fs.readFileSync(typesPath, 'utf8');
      
      // Check if mannschaft types are present
      if (!typesContent.includes('ApiMannschaftMannschaft')) {
        this.log('Mannschaft types not found in generated types file', 'error');
        return false;
      }

      this.log('Schema appears to be compiled successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Error checking schema compilation: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Compare schema with generated TypeScript types
   */
  compareSchemaWithTypes(schema) {
    this.log('Comparing schema with generated TypeScript types...');
    
    try {
      // Check if generated types exist (try both locations)
      let typesPath = this.typesPath;
      if (!fs.existsSync(this.typesPath) && fs.existsSync(this.rootTypesPath)) {
        typesPath = this.rootTypesPath;
        this.log('Using root types directory for comparison', 'info');
      } else if (!fs.existsSync(this.typesPath)) {
        this.log('Generated types file not found, skipping comparison', 'warning');
        return false;
      }

      const typesContent = fs.readFileSync(typesPath, 'utf8');
      
      // Extract mannschaft type definition
      const mannschaftTypeMatch = typesContent.match(/export interface ApiMannschaftMannschaft[\s\S]*?^}/m);
      
      if (!mannschaftTypeMatch) {
        this.log('Could not find ApiMannschaftMannschaft interface in types file', 'error');
        return false;
      }

      const mannschaftType = mannschaftTypeMatch[0];
      
      // Check enum values in types
      const enumFields = ['status', 'liga', 'altersklasse', 'trend'];
      let typesValid = true;

      for (const fieldName of enumFields) {
        const schemaEnum = schema.attributes[fieldName]?.enum;
        if (!schemaEnum) continue;

        // Look for the field in the types
        const fieldRegex = new RegExp(`${fieldName}:[^;]*Schema\\.Attribute\\.Enumeration<\\[([^\\]]+)\\]>`, 'i');
        const fieldMatch = mannschaftType.match(fieldRegex);

        if (!fieldMatch) {
          // Check if field exists but is not an enumeration
          const anyFieldRegex = new RegExp(`${fieldName}:[^;]*Schema\\.Attribute\\.([^&\\s]+)`, 'i');
          const anyFieldMatch = mannschaftType.match(anyFieldRegex);
          
          if (anyFieldMatch) {
            this.log(`Field ${fieldName} found but is type '${anyFieldMatch[1]}' instead of 'Enumeration'`, 'error');
          } else {
            this.log(`Field ${fieldName} not found in generated types`, 'error');
          }
          typesValid = false;
          continue;
        }

        // Extract enum values from types
        const typeEnumString = fieldMatch[1];
        const typeEnumValues = typeEnumString
          .split(',')
          .map(val => val.trim().replace(/['"]/g, ''))
          .filter(val => val.length > 0);

        // Compare with schema enum values
        const schemaMissing = schemaEnum.filter(val => !typeEnumValues.includes(val));
        const typesMissing = typeEnumValues.filter(val => !schemaEnum.includes(val));

        if (schemaMissing.length > 0) {
          this.log(`Field ${fieldName}: Schema values missing in types: ${schemaMissing.join(', ')}`, 'error');
          typesValid = false;
        }

        if (typesMissing.length > 0) {
          this.log(`Field ${fieldName}: Type values missing in schema: ${typesMissing.join(', ')}`, 'error');
          typesValid = false;
        }

        if (schemaMissing.length === 0 && typesMissing.length === 0) {
          this.log(`Field ${fieldName}: Schema and types are in sync`, 'success');
        }
      }

      return typesValid;
    } catch (error) {
      this.log(`Error comparing schema with types: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Check for version mismatches
   */
  checkVersionMismatches() {
    this.log('Checking for version mismatches...');
    
    try {
      const packageJsonPath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const strapiVersion = packageJson.dependencies['@strapi/strapi'];
      this.log(`Strapi version: ${strapiVersion}`, 'info');

      // Check if .strapi directory exists (build cache)
      const strapiBuildPath = path.join(__dirname, '../.strapi');
      if (fs.existsSync(strapiBuildPath)) {
        this.log('Strapi build cache directory exists', 'info');
        
        // Check build timestamp
        const buildStats = fs.statSync(strapiBuildPath);
        const schemaStats = fs.statSync(this.schemaPath);
        
        if (schemaStats.mtime > buildStats.mtime) {
          this.log('Schema file is newer than build cache - rebuild recommended', 'warning');
          return false;
        } else {
          this.log('Build cache is up to date with schema', 'success');
        }
      } else {
        this.log('No build cache found - initial build required', 'warning');
        return false;
      }

      return true;
    } catch (error) {
      this.log(`Error checking version mismatches: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Generate validation report
   */
  generateReport() {
    this.log('Generating validation report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        info: this.info.length
      },
      details: {
        errors: this.errors,
        warnings: this.warnings,
        info: this.info
      },
      recommendations: []
    };

    // Add recommendations based on findings
    if (this.errors.length > 0) {
      report.recommendations.push('Fix all errors before proceeding with schema operations');
    }

    if (this.warnings.length > 0) {
      report.recommendations.push('Review warnings to ensure optimal schema configuration');
    }

    if (this.errors.some(err => err.includes('Generated types file not found'))) {
      report.recommendations.push('Run "npm run build" to generate TypeScript types');
    }

    if (this.warnings.some(warn => warn.includes('newer than build cache'))) {
      report.recommendations.push('Run schema rebuild script to update build cache');
    }

    // Save report to file
    const reportPath = path.join(__dirname, '../validation-reports/schema-validation-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Validation report saved to: ${reportPath}`, 'success');

    return report;
  }

  /**
   * Run complete validation
   */
  async runValidation() {
    this.log('Starting schema validation...');
    console.log(chalk.cyan('=' .repeat(60)));
    
    let overallValid = true;

    // 1. Validate JSON syntax
    const schema = this.validateSchemaJsonSyntax();
    if (!schema) {
      overallValid = false;
      return this.generateReport();
    }

    // 2. Validate enum definitions
    const enumsValid = this.validateEnumDefinitions(schema);
    if (!enumsValid) overallValid = false;

    // 3. Validate required fields
    const requiredValid = this.validateRequiredFields(schema);
    if (!requiredValid) overallValid = false;

    // 4. Check schema compilation
    const compilationValid = this.checkSchemaCompilation();
    if (!compilationValid) overallValid = false;

    // 5. Compare with generated types
    const typesValid = this.compareSchemaWithTypes(schema);
    if (!typesValid) overallValid = false;

    // 6. Check version mismatches
    const versionValid = this.checkVersionMismatches();
    if (!versionValid) overallValid = false;

    console.log(chalk.cyan('=' .repeat(60)));
    
    if (overallValid) {
      this.log('Schema validation completed successfully!', 'success');
    } else {
      this.log('Schema validation completed with issues', 'error');
    }

    const report = this.generateReport();
    
    // Print summary
    console.log(chalk.cyan('\nValidation Summary:'));
    console.log(chalk.red(`  Errors: ${report.summary.errors}`));
    console.log(chalk.yellow(`  Warnings: ${report.summary.warnings}`));
    console.log(chalk.blue(`  Info: ${report.summary.info}`));

    if (report.recommendations.length > 0) {
      console.log(chalk.cyan('\nRecommendations:'));
      report.recommendations.forEach((rec, index) => {
        console.log(chalk.white(`  ${index + 1}. ${rec}`));
      });
    }

    return report;
  }
}

// Run validation if called directly
if (require.main === module) {
  const checker = new SchemaValidationChecker();
  checker.runValidation()
    .then(report => {
      process.exit(report.summary.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error(chalk.red('Validation failed:'), error);
      process.exit(1);
    });
}

module.exports = SchemaValidationChecker;