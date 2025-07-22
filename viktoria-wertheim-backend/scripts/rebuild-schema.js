/**
 * Schema Rebuild and Validation Fix Script
 * 
 * This script rebuilds the schema and adds explicit validation
 * to prevent null/undefined values for enum fields.
 */

const fs = require('fs').promises;
const path = require('path');

const SCHEMA_PATH = './src/api/mannschaft/content-types/mannschaft/schema.json';

async function rebuildSchema() {
  console.log('🔧 Rebuilding and strengthening schema validation...');
  
  try {
    // Read current schema
    const schemaContent = await fs.readFile(SCHEMA_PATH, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    console.log('📋 Current schema loaded');
    
    // Identify enum fields that need strengthening
    const enumFields = [];
    Object.entries(schema.attributes).forEach(([fieldName, fieldDef]) => {
      if (fieldDef.type === 'enumeration') {
        enumFields.push(fieldName);
      }
    });
    
    console.log(`🔍 Found ${enumFields.length} enum fields: ${enumFields.join(', ')}`);
    
    // Strengthen enum field validation
    let schemaModified = false;
    enumFields.forEach(fieldName => {
      const fieldDef = schema.attributes[fieldName];
      
      // Add required validation for critical enum fields
      if (['status', 'liga', 'altersklasse'].includes(fieldName)) {
        if (!fieldDef.required) {
          console.log(`🔒 Making ${fieldName} required`);
          fieldDef.required = true;
          schemaModified = true;
        }
      }
      
      // Add custom validation to reject null/undefined
      if (!fieldDef.validate) {
        fieldDef.validate = {};
      }
      
      // Add custom validator function reference
      if (!fieldDef.validate.custom) {
        console.log(`🛡️ Adding custom validation for ${fieldName}`);
        fieldDef.validate.custom = 'validateEnumNotNull';
        schemaModified = true;
      }
    });
    
    if (schemaModified) {
      // Backup original schema
      const backupPath = `${SCHEMA_PATH}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, schemaContent);
      console.log(`💾 Original schema backed up to: ${backupPath}`);
      
      // Write updated schema
      await fs.writeFile(SCHEMA_PATH, JSON.stringify(schema, null, 2));
      console.log('✅ Schema updated with strengthened validation');
    } else {
      console.log('ℹ️ Schema already has proper validation');
    }
    
    return { success: true, modified: schemaModified, enumFields };
    
  } catch (error) {
    console.error('❌ Error rebuilding schema:', error.message);
    return { success: false, error: error.message };
  }
}

async function createCustomValidators() {
  console.log('🔧 Creating custom validation functions...');
  
  const validatorPath = './src/api/mannschaft/content-types/mannschaft/validators.js';
  
  const validatorContent = `/**
 * Custom validators for Mannschaft content type
 * 
 * These validators ensure enum fields don't accept null/undefined values
 */

/**
 * Validates that enum fields are not null or undefined
 * @param {*} value - The value to validate
 * @param {Object} field - Field definition
 * @returns {boolean|string} - true if valid, error message if invalid
 */
function validateEnumNotNull(value, field) {
  // Allow empty string for optional fields, but not null/undefined
  if (value === null || value === undefined) {
    return \`\${field.name || 'Field'} cannot be null or undefined\`;
  }
  
  // If field has enum values, validate against them
  if (field.enum && field.enum.length > 0) {
    if (value !== '' && !field.enum.includes(value)) {
      return \`\${field.name || 'Field'} must be one of: \${field.enum.join(', ')}\`;
    }
  }
  
  return true;
}

module.exports = {
  validateEnumNotNull
};
`;

  try {
    await fs.writeFile(validatorPath, validatorContent);
    console.log(`✅ Custom validators created at: ${validatorPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error creating validators:', error.message);
    return false;
  }
}

async function createLifecycleHooks() {
  console.log('🔧 Creating lifecycle hooks for validation...');
  
  const lifecyclePath = './src/api/mannschaft/content-types/mannschaft/lifecycles.js';
  
  const lifecycleContent = `/**
 * Lifecycle hooks for Mannschaft content type
 * 
 * These hooks provide additional validation for enum fields
 */

const ENUM_FIELDS = {
  status: ['aktiv', 'inaktiv', 'aufgeloest'],
  liga: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
  altersklasse: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini'],
  trend: ['steigend', 'gleich', 'fallend']
};

/**
 * Validates enum fields before create/update
 * @param {Object} event - Strapi lifecycle event
 */
function validateEnumFields(event) {
  const { data } = event.params;
  
  Object.entries(ENUM_FIELDS).forEach(([fieldName, allowedValues]) => {
    const value = data[fieldName];
    
    // Reject null and undefined explicitly
    if (value === null || value === undefined) {
      throw new Error(\`Field "\${fieldName}" cannot be null or undefined\`);
    }
    
    // For non-empty values, validate against enum
    if (value !== '' && !allowedValues.includes(value)) {
      throw new Error(\`Field "\${fieldName}" must be one of: \${allowedValues.join(', ')}. Received: "\${value}"\`);
    }
  });
}

module.exports = {
  beforeCreate(event) {
    validateEnumFields(event);
  },
  
  beforeUpdate(event) {
    validateEnumFields(event);
  }
};
`;

  try {
    await fs.writeFile(lifecyclePath, lifecycleContent);
    console.log(`✅ Lifecycle hooks created at: ${lifecyclePath}`);
    return true;
  } catch (error) {
    console.error('❌ Error creating lifecycle hooks:', error.message);
    return false;
  }
}

async function verifySchemaIntegrity() {
  console.log('🔍 Verifying schema integrity...');
  
  try {
    const schemaContent = await fs.readFile(SCHEMA_PATH, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    const issues = [];
    
    // Check enum fields
    Object.entries(schema.attributes).forEach(([fieldName, fieldDef]) => {
      if (fieldDef.type === 'enumeration') {
        if (!fieldDef.enum || fieldDef.enum.length === 0) {
          issues.push(`Enum field "${fieldName}" has no enum values defined`);
        }
        
        // Check for duplicate values
        const uniqueValues = [...new Set(fieldDef.enum)];
        if (uniqueValues.length !== fieldDef.enum.length) {
          issues.push(`Enum field "${fieldName}" has duplicate values`);
        }
      }
    });
    
    if (issues.length > 0) {
      console.log('⚠️ Schema integrity issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      return false;
    } else {
      console.log('✅ Schema integrity verified');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error verifying schema:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Schema Rebuild Process...');
  console.log('='.repeat(50));
  
  // Step 1: Rebuild schema
  const rebuildResult = await rebuildSchema();
  if (!rebuildResult.success) {
    console.error('❌ Schema rebuild failed');
    process.exit(1);
  }
  
  // Step 2: Create custom validators
  const validatorsCreated = await createCustomValidators();
  if (!validatorsCreated) {
    console.warn('⚠️ Custom validators creation failed');
  }
  
  // Step 3: Create lifecycle hooks
  const hooksCreated = await createLifecycleHooks();
  if (!hooksCreated) {
    console.warn('⚠️ Lifecycle hooks creation failed');
  }
  
  // Step 4: Verify schema integrity
  const integrityOk = await verifySchemaIntegrity();
  if (!integrityOk) {
    console.warn('⚠️ Schema integrity issues detected');
  }
  
  console.log('\n📊 SCHEMA REBUILD SUMMARY');
  console.log('='.repeat(50));
  console.log(`Schema Modified: ${rebuildResult.modified ? '✅ Yes' : 'ℹ️ No changes needed'}`);
  console.log(`Custom Validators: ${validatorsCreated ? '✅ Created' : '❌ Failed'}`);
  console.log(`Lifecycle Hooks: ${hooksCreated ? '✅ Created' : '❌ Failed'}`);
  console.log(`Schema Integrity: ${integrityOk ? '✅ Valid' : '⚠️ Issues found'}`);
  
  if (rebuildResult.enumFields) {
    console.log(`Enum Fields: ${rebuildResult.enumFields.join(', ')}`);
  }
  
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Restart Strapi server to reload schema changes');
  console.log('2. Run validation diagnostic to verify fixes');
  console.log('3. Test admin panel and API endpoints');
  
  console.log('\n✅ Schema rebuild process completed!');
}

// Export for testing
module.exports = {
  rebuildSchema,
  createCustomValidators,
  createLifecycleHooks,
  verifySchemaIntegrity
};

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Schema rebuild failed:', error.message);
    process.exit(1);
  });
}