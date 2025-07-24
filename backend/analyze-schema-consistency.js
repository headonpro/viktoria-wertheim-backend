/**
 * Comprehensive schema consistency analysis for Collection Types
 */

const fs = require('fs');
const path = require('path');

function analyzeSchemaConsistency() {
  console.log('🔍 Analyzing Collection Type Schema Consistency...\n');

  const apiPath = path.join(__dirname, 'src', 'api');
  const issues = [];
  const schemas = {};

  // Read all schema files
  const apiDirs = fs.readdirSync(apiPath);
  
  for (const apiDir of apiDirs) {
    const schemaPath = path.join(apiPath, apiDir, 'content-types', apiDir, 'schema.json');
    
    if (fs.existsSync(schemaPath)) {
      try {
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        const schema = JSON.parse(schemaContent);
        schemas[apiDir] = schema;
      } catch (error) {
        issues.push({
          type: 'SCHEMA_PARSE_ERROR',
          collection: apiDir,
          severity: 'HIGH',
          message: `Failed to parse schema: ${error.message}`
        });
      }
    } else {
      // Check if directory has controllers/services but no schema
      const controllersPath = path.join(apiPath, apiDir, 'controllers');
      if (fs.existsSync(controllersPath)) {
        issues.push({
          type: 'MISSING_SCHEMA',
          collection: apiDir,
          severity: 'HIGH',
          message: 'Collection has controllers but no schema.json file'
        });
      }
    }
  }

  console.log(`📋 Found ${Object.keys(schemas).length} collection schemas\n`);

  // 1. Check for relation consistency
  console.log('🔍 Checking relation consistency...');
  
  const relationMap = {};
  
  // Build relation map
  for (const [collectionName, schema] of Object.entries(schemas)) {
    relationMap[collectionName] = [];
    
    for (const [attrName, attr] of Object.entries(schema.attributes || {})) {
      if (attr.type === 'relation') {
        relationMap[collectionName].push({
          attribute: attrName,
          relation: attr.relation,
          target: attr.target,
          inversedBy: attr.inversedBy,
          mappedBy: attr.mappedBy
        });
      }
    }
  }

  // Check for broken relation references
  for (const [collectionName, relations] of Object.entries(relationMap)) {
    for (const rel of relations) {
      const targetCollection = rel.target?.replace('api::', '').replace(/\.[^.]+$/, '');
      
      if (targetCollection && !schemas[targetCollection]) {
        issues.push({
          type: 'BROKEN_RELATION_TARGET',
          collection: collectionName,
          attribute: rel.attribute,
          target: targetCollection,
          severity: 'HIGH',
          message: `Relation targets non-existent collection: ${targetCollection}`
        });
      }
      
      // Check inverse relations
      if (rel.inversedBy && targetCollection && schemas[targetCollection]) {
        const targetSchema = schemas[targetCollection];
        const inverseAttr = targetSchema.attributes?.[rel.inversedBy];
        
        if (!inverseAttr) {
          issues.push({
            type: 'MISSING_INVERSE_RELATION',
            collection: collectionName,
            attribute: rel.attribute,
            target: targetCollection,
            inversedBy: rel.inversedBy,
            severity: 'MEDIUM',
            message: `Inverse relation '${rel.inversedBy}' not found in ${targetCollection}`
          });
        } else if (inverseAttr.type !== 'relation') {
          issues.push({
            type: 'INVALID_INVERSE_RELATION',
            collection: collectionName,
            attribute: rel.attribute,
            target: targetCollection,
            inversedBy: rel.inversedBy,
            severity: 'HIGH',
            message: `Inverse attribute '${rel.inversedBy}' is not a relation`
          });
        }
      }
      
      // Check mapped relations
      if (rel.mappedBy && targetCollection && schemas[targetCollection]) {
        const targetSchema = schemas[targetCollection];
        const mappedAttr = targetSchema.attributes?.[rel.mappedBy];
        
        if (!mappedAttr) {
          issues.push({
            type: 'MISSING_MAPPED_RELATION',
            collection: collectionName,
            attribute: rel.attribute,
            target: targetCollection,
            mappedBy: rel.mappedBy,
            severity: 'MEDIUM',
            message: `Mapped relation '${rel.mappedBy}' not found in ${targetCollection}`
          });
        }
      }
    }
  }

  // 2. Check for relation type mismatches
  console.log('🔍 Checking relation type consistency...');
  
  const relationPairs = [];
  
  for (const [collectionName, relations] of Object.entries(relationMap)) {
    for (const rel of relations) {
      const targetCollection = rel.target?.replace('api::', '').replace(/\.[^.]+$/, '');
      
      if (rel.inversedBy && targetCollection && schemas[targetCollection]) {
        const targetSchema = schemas[targetCollection];
        const inverseAttr = targetSchema.attributes?.[rel.inversedBy];
        
        if (inverseAttr && inverseAttr.type === 'relation') {
          relationPairs.push({
            from: { collection: collectionName, attr: rel },
            to: { collection: targetCollection, attr: inverseAttr }
          });
        }
      }
    }
  }
  
  for (const pair of relationPairs) {
    const fromRel = pair.from.attr.relation;
    const toRel = pair.to.attr.relation;
    
    // Check if relation types are compatible
    const validPairs = [
      ['oneToOne', 'oneToOne'],
      ['oneToMany', 'manyToOne'],
      ['manyToOne', 'oneToMany'],
      ['manyToMany', 'manyToMany']
    ];
    
    const isValid = validPairs.some(([a, b]) => 
      (fromRel === a && toRel === b) || (fromRel === b && toRel === a)
    );
    
    if (!isValid) {
      issues.push({
        type: 'INCOMPATIBLE_RELATION_TYPES',
        collection: pair.from.collection,
        attribute: pair.from.attr.attribute,
        target: pair.to.collection,
        severity: 'HIGH',
        message: `Incompatible relation types: ${fromRel} <-> ${toRel}`
      });
    }
  }

  // 3. Check for potential naming inconsistencies
  console.log('🔍 Checking naming consistency...');
  
  for (const [collectionName, schema] of Object.entries(schemas)) {
    // Check collection name vs file path consistency
    const expectedSingular = schema.info?.singularName;
    const expectedPlural = schema.info?.pluralName;
    
    if (expectedSingular && expectedSingular !== collectionName) {
      issues.push({
        type: 'COLLECTION_NAME_MISMATCH',
        collection: collectionName,
        severity: 'LOW',
        message: `Directory name '${collectionName}' doesn't match singularName '${expectedSingular}'`
      });
    }
    
    // Check for potential duplicate collections (similar names)
    const similarCollections = Object.keys(schemas).filter(name => 
      name !== collectionName && 
      (name.includes(collectionName) || collectionName.includes(name))
    );
    
    if (similarCollections.length > 0) {
      issues.push({
        type: 'SIMILAR_COLLECTION_NAMES',
        collection: collectionName,
        similar: similarCollections,
        severity: 'LOW',
        message: `Similar collection names found: ${similarCollections.join(', ')}`
      });
    }
  }

  // 4. Check for missing essential attributes
  console.log('🔍 Checking for missing essential attributes...');
  
  const essentialChecks = {
    'spiel': ['datum', 'heimclub', 'auswaertsclub', 'unser_team'],
    'spieler': ['vorname', 'nachname'],
    'team': ['name', 'club'],
    'club': ['name'],
    'liga': ['name'],
    'saison': ['name', 'start_datum', 'end_datum']
  };
  
  for (const [collectionName, requiredAttrs] of Object.entries(essentialChecks)) {
    if (schemas[collectionName]) {
      const schema = schemas[collectionName];
      const attributes = Object.keys(schema.attributes || {});
      
      for (const requiredAttr of requiredAttrs) {
        if (!attributes.includes(requiredAttr)) {
          issues.push({
            type: 'MISSING_ESSENTIAL_ATTRIBUTE',
            collection: collectionName,
            attribute: requiredAttr,
            severity: 'MEDIUM',
            message: `Missing essential attribute: ${requiredAttr}`
          });
        }
      }
    }
  }

  // 5. Check for unused collections (no controllers/services)
  console.log('🔍 Checking for unused collections...');
  
  for (const [collectionName, schema] of Object.entries(schemas)) {
    const controllersPath = path.join(apiPath, collectionName, 'controllers');
    const servicesPath = path.join(apiPath, collectionName, 'services');
    
    const hasControllers = fs.existsSync(controllersPath) && fs.readdirSync(controllersPath).length > 0;
    const hasServices = fs.existsSync(servicesPath) && fs.readdirSync(servicesPath).length > 0;
    
    if (!hasControllers && !hasServices) {
      issues.push({
        type: 'UNUSED_COLLECTION',
        collection: collectionName,
        severity: 'LOW',
        message: 'Collection has schema but no controllers or services'
      });
    }
  }

  // 6. Check for potential circular dependencies
  console.log('🔍 Checking for circular dependencies...');
  
  function findCircularDependencies(collectionName, visited = new Set(), path = []) {
    if (visited.has(collectionName)) {
      const circleStart = path.indexOf(collectionName);
      if (circleStart !== -1) {
        return path.slice(circleStart).concat([collectionName]);
      }
      return null;
    }
    
    visited.add(collectionName);
    path.push(collectionName);
    
    const relations = relationMap[collectionName] || [];
    
    for (const rel of relations) {
      const targetCollection = rel.target?.replace('api::', '').replace(/\.[^.]+$/, '');
      if (targetCollection && schemas[targetCollection]) {
        const cycle = findCircularDependencies(targetCollection, new Set(visited), [...path]);
        if (cycle) {
          return cycle;
        }
      }
    }
    
    return null;
  }
  
  for (const collectionName of Object.keys(schemas)) {
    const cycle = findCircularDependencies(collectionName);
    if (cycle) {
      issues.push({
        type: 'CIRCULAR_DEPENDENCY',
        collection: collectionName,
        cycle: cycle,
        severity: 'MEDIUM',
        message: `Circular dependency detected: ${cycle.join(' -> ')}`
      });
      break; // Only report first cycle found
    }
  }

  // Summary
  console.log('\n📊 SCHEMA CONSISTENCY ANALYSIS SUMMARY:');
  console.log('=======================================');
  
  if (issues.length === 0) {
    console.log('✅ No schema consistency issues found! All collection types are properly defined.');
  } else {
    const highSeverity = issues.filter(i => i.severity === 'HIGH').length;
    const mediumSeverity = issues.filter(i => i.severity === 'MEDIUM').length;
    const lowSeverity = issues.filter(i => i.severity === 'LOW').length;
    
    console.log(`Total issues found: ${issues.length}`);
    console.log(`- High severity: ${highSeverity}`);
    console.log(`- Medium severity: ${mediumSeverity}`);
    console.log(`- Low severity: ${lowSeverity}`);
    
    console.log('\nDetailed Issues:');
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.type} (${issue.severity})`);
      console.log(`   Collection: ${issue.collection}`);
      if (issue.attribute) console.log(`   Attribute: ${issue.attribute}`);
      if (issue.target) console.log(`   Target: ${issue.target}`);
      if (issue.similar) console.log(`   Similar: ${issue.similar.join(', ')}`);
      if (issue.cycle) console.log(`   Cycle: ${issue.cycle.join(' -> ')}`);
      console.log(`   Message: ${issue.message}`);
    });
  }

  return issues;
}

// Run the analysis
try {
  const issues = analyzeSchemaConsistency();
  if (issues.filter(i => i.severity === 'HIGH').length > 0) {
    process.exit(1); // Exit with error code if high severity issues found
  }
} catch (error) {
  console.error('Failed to analyze schema consistency:', error);
  process.exit(1);
}