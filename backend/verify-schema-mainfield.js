const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying schema mainField configuration...\n');

try {
  // Read the schema file
  const schemaPath = path.join(__dirname, 'src/api/tabellen-eintrag/content-types/tabellen-eintrag/schema.json');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(schemaContent);
  
  console.log('📋 Schema Analysis:');
  console.log('- Display Name:', schema.info.displayName);
  console.log('- Main Field:', schema.options?.mainField || '❌ Not set');
  console.log('- First Attribute:', Object.keys(schema.attributes)[0]);
  
  // Verify mainField is set correctly
  if (schema.options?.mainField === 'team_name') {
    console.log('✅ Main field is correctly set to "team_name"');
  } else {
    console.log('❌ Main field is not set to "team_name"');
  }
  
  // Show attribute order
  console.log('\n📝 Attribute Order:');
  Object.keys(schema.attributes).forEach((key, index) => {
    const attr = schema.attributes[key];
    const isMainField = key === schema.options?.mainField;
    console.log(`${index + 1}. ${key} (${attr.type})${isMainField ? ' ← MAIN FIELD' : ''}`);
  });
  
  console.log('\n💡 Expected Admin Panel Behavior:');
  console.log('- In the Content Manager list view, you should see team names instead of liga names');
  console.log('- In the detail view, team_name should be prominently displayed');
  console.log('- The breadcrumb should show the team name');
  
  console.log('\n✅ Schema verification completed!');
  console.log('\n🚀 Next steps:');
  console.log('1. Start Strapi: npm run develop');
  console.log('2. Go to Content Manager > Tabellen Eintrag');
  console.log('3. Check if team names are now displayed instead of liga names');
  
} catch (error) {
  console.error('❌ Error reading schema:', error.message);
}