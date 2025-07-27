const strapi = require('@strapi/strapi');

async function testAdminDisplay() {
  console.log('🔍 Testing admin panel display configuration...\n');
  
  try {
    // Initialize Strapi
    const app = await strapi.createStrapi().load();
    
    // Get the tabellen-eintrag content type
    const contentType = app.contentType('api::tabellen-eintrag.tabellen-eintrag');
    
    console.log('📋 Content Type Configuration:');
    console.log('- Display Name:', contentType.info.displayName);
    console.log('- Main Field:', contentType.options?.mainField || 'Not explicitly set');
    console.log('- First Attribute:', Object.keys(contentType.attributes)[0]);
    
    // Check if mainField is properly configured
    if (contentType.options?.mainField === 'team_name') {
      console.log('✅ Main field is correctly set to "team_name"');
    } else {
      console.log('❌ Main field is not set to "team_name"');
    }
    
    // List all attributes in order
    console.log('\n📝 Attribute Order:');
    Object.keys(contentType.attributes).forEach((key, index) => {
      const attr = contentType.attributes[key];
      console.log(`${index + 1}. ${key} (${attr.type})`);
    });
    
    // Test data retrieval to see what would be displayed
    console.log('\n🔍 Testing data display...');
    const entries = await app.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      limit: 3,
      populate: ['liga']
    });
    
    if (entries && entries.length > 0) {
      console.log('Sample entries that would be displayed:');
      entries.forEach((entry, index) => {
        console.log(`${index + 1}. Main display: "${entry.team_name}" (Liga: ${entry.liga?.name || 'N/A'})`);
      });
    } else {
      console.log('No entries found to test display');
    }
    
    console.log('\n✅ Admin display test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing admin display:', error.message);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

testAdminDisplay();