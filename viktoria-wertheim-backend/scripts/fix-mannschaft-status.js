const axios = require('axios');

async function fixMannschaftStatus() {
  console.log('🔧 Fixing Mannschaft Status Validation Error...\n');
  
  const baseUrl = 'http://localhost:1337';
  
  try {
    // 1. Get all Mannschaften
    console.log('1. Fetching all Mannschaften...');
    const response = await axios.get(`${baseUrl}/api/mannschaften?populate=*`);
    const mannschaften = response.data.data;
    
    console.log(`Found ${mannschaften.length} Mannschaften`);
    
    // 2. Check for invalid status values
    for (const mannschaft of mannschaften) {
      const { id, attributes } = mannschaft;
      const { name, status } = attributes;
      
      console.log(`\nChecking: ${name}`);
      console.log(`Current status: "${status}"`);
      
      // Valid status values
      const validStatuses = ['aktiv', 'inaktiv', 'aufgeloest'];
      
      if (!validStatuses.includes(status)) {
        console.log(`❌ INVALID STATUS: "${status}"`);
        console.log('Valid options are: aktiv, inaktiv, aufgeloest');
        
        // Fix it by setting to 'aktiv'
        console.log('Fixing to "aktiv"...');
        
        try {
          await axios.put(`${baseUrl}/api/mannschaften/${id}`, {
            data: {
              status: 'aktiv'
            }
          });
          console.log('✅ Fixed!');
        } catch (error) {
          console.log('❌ Fix failed:', error.response?.data || error.message);
        }
      } else {
        console.log('✅ Status is valid');
      }
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('All Mannschaften should now have valid status values.');
    console.log('Try editing a Mannschaft in the admin panel now.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

fixMannschaftStatus();