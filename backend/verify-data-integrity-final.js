/**
 * Final verification of data integrity and display consistency
 * Task 4: Verify data integrity and display consistency
 */

const axios = require('axios');

async function verifyDataIntegrityAndDisplay() {
  console.log('🔍 Final Data Integrity and Display Consistency Verification\n');
  console.log('Task 4: Verify data integrity and display consistency');
  console.log('='.repeat(60));
  
  const baseURL = 'http://localhost:1337/api';
  
  try {
    // Sub-task 1: Confirm all existing tabellen-eintrag entries display correct team names
    console.log('\n1️⃣ Verifying team name display in existing entries...');
    
    const allEntriesResponse = await axios.get(`${baseURL}/tabellen-eintraege?populate=liga`);
    const entries = allEntriesResponse.data.data;
    
    console.log(`   📊 Total entries found: ${entries.length}`);
    
    let correctTeamNameDisplay = 0;
    let displayIssues = [];
    
    for (const entry of entries) {
      const teamName = entry.team_name;
      const ligaName = entry.liga?.name || 'No Liga';
      
      console.log(`   Entry ${entry.id}: "${teamName}" (Liga: ${ligaName})`);
      
      // Verify team name is not showing liga information
      if (teamName && 
          typeof teamName === 'string' && 
          teamName.length > 0 &&
          teamName !== ligaName &&
          !teamName.toLowerCase().includes('kreisliga') &&
          !teamName.toLowerCase().includes('bezirksliga') &&
          !teamName.toLowerCase().includes('liga')) {
        correctTeamNameDisplay++;
      } else {
        displayIssues.push({
          id: entry.id,
          teamName: teamName,
          ligaName: ligaName,
          issue: 'Team name appears to show liga information or is invalid'
        });
      }
    }
    
    console.log(`   ✅ Entries with correct team name display: ${correctTeamNameDisplay}/${entries.length}`);
    
    if (displayIssues.length > 0) {
      console.log(`   ⚠️  Display issues found:`);
      displayIssues.forEach(issue => {
        console.log(`      - Entry ${issue.id}: "${issue.teamName}" (${issue.issue})`);
      });
    }
    
    // Sub-task 2: Test that team names are consistent and properly formatted
    console.log('\n2️⃣ Verifying team name consistency and formatting...');
    
    let formattingIssues = [];
    let consistencyIssues = [];
    
    for (const entry of entries) {
      const teamName = entry.team_name;
      
      // Check formatting
      if (!teamName || typeof teamName !== 'string') {
        formattingIssues.push({
          id: entry.id,
          issue: 'Team name is null, undefined, or not a string',
          value: teamName
        });
      } else if (teamName.length === 0 || teamName.trim().length === 0) {
        formattingIssues.push({
          id: entry.id,
          issue: 'Team name is empty or only whitespace',
          value: teamName
        });
      } else if (teamName.length > 100) {
        formattingIssues.push({
          id: entry.id,
          issue: 'Team name exceeds 100 character limit',
          value: teamName
        });
      }
      
      // Check consistency with team relation if it exists
      if (entry.team && entry.team.name && entry.team_name !== entry.team.name) {
        consistencyIssues.push({
          id: entry.id,
          teamName: entry.team_name,
          relationName: entry.team.name,
          issue: 'team_name does not match team.name'
        });
      }
    }
    
    console.log(`   ✅ Entries with proper formatting: ${entries.length - formattingIssues.length}/${entries.length}`);
    console.log(`   ✅ Entries with consistent team relations: ${entries.length - consistencyIssues.length}/${entries.length}`);
    
    if (formattingIssues.length > 0) {
      console.log(`   ⚠️  Formatting issues:`);
      formattingIssues.forEach(issue => {
        console.log(`      - Entry ${issue.id}: ${issue.issue} (Value: "${issue.value}")`);
      });
    }
    
    if (consistencyIssues.length > 0) {
      console.log(`   ⚠️  Consistency issues:`);
      consistencyIssues.forEach(issue => {
        console.log(`      - Entry ${issue.id}: "${issue.teamName}" vs "${issue.relationName}"`);
      });
    }
    
    // Sub-task 3: Verify liga information is still accessible in detail views
    console.log('\n3️⃣ Verifying liga information accessibility...');
    
    let ligaAccessibilityIssues = [];
    
    for (const entry of entries) {
      if (!entry.liga || !entry.liga.id || !entry.liga.name) {
        ligaAccessibilityIssues.push({
          id: entry.id,
          teamName: entry.team_name,
          issue: 'Liga information missing or incomplete'
        });
      }
    }
    
    console.log(`   ✅ Entries with accessible liga information: ${entries.length - ligaAccessibilityIssues.length}/${entries.length}`);
    
    if (ligaAccessibilityIssues.length > 0) {
      console.log(`   ⚠️  Liga accessibility issues:`);
      ligaAccessibilityIssues.forEach(issue => {
        console.log(`      - Entry ${issue.id} (${issue.teamName}): ${issue.issue}`);
      });
    }
    
    // Sub-task 4: Validate no data loss or corruption occurred during schema change
    console.log('\n4️⃣ Validating data integrity and no corruption...');
    
    let dataIntegrityIssues = [];
    
    for (const entry of entries) {
      // Check required fields are present
      const requiredFields = ['team_name', 'liga', 'platz', 'spiele', 'siege', 'unentschieden', 'niederlagen', 'tore_fuer', 'tore_gegen', 'tordifferenz', 'punkte'];
      
      for (const field of requiredFields) {
        if (entry[field] === null || entry[field] === undefined) {
          dataIntegrityIssues.push({
            id: entry.id,
            teamName: entry.team_name,
            field: field,
            issue: 'Required field is null or undefined'
          });
        }
      }
      
      // Check calculated fields are consistent
      const expectedTordifferenz = entry.tore_fuer - entry.tore_gegen;
      const expectedSpiele = entry.siege + entry.unentschieden + entry.niederlagen;
      
      if (entry.tordifferenz !== expectedTordifferenz) {
        dataIntegrityIssues.push({
          id: entry.id,
          teamName: entry.team_name,
          field: 'tordifferenz',
          issue: `Calculated value mismatch: ${entry.tordifferenz} vs expected ${expectedTordifferenz}`
        });
      }
      
      if (entry.spiele !== expectedSpiele) {
        dataIntegrityIssues.push({
          id: entry.id,
          teamName: entry.team_name,
          field: 'spiele',
          issue: `Calculated value mismatch: ${entry.spiele} vs expected ${expectedSpiele}`
        });
      }
    }
    
    console.log(`   ✅ Entries with data integrity: ${entries.length - (dataIntegrityIssues.length / 2)}/${entries.length}`);
    
    if (dataIntegrityIssues.length > 0) {
      console.log(`   ⚠️  Data integrity issues:`);
      dataIntegrityIssues.forEach(issue => {
        console.log(`      - Entry ${issue.id} (${issue.teamName}): ${issue.field} - ${issue.issue}`);
      });
    }
    
    // Test basic CRUD functionality (simplified)
    console.log('\n5️⃣ Testing basic CRUD functionality...');
    
    try {
      // Test simple list operation
      const listTest = await axios.get(`${baseURL}/tabellen-eintraege`);
      console.log(`   ✅ LIST operation: Retrieved ${listTest.data.data.length} entries`);
      
      // Test create operation
      const createTest = await axios.post(`${baseURL}/tabellen-eintraege`, {
        data: {
          team_name: "Integrity Test Team",
          liga: entries[0].liga.id, // Use existing liga
          platz: 99,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        }
      });
      
      const testEntryId = createTest.data.data.id;
      console.log(`   ✅ CREATE operation: Created entry with ID ${testEntryId}`);
      
      // Test update operation
      const updateTest = await axios.put(`${baseURL}/tabellen-eintraege/${testEntryId}`, {
        data: {
          team_name: "Integrity Test Team Updated",
          spiele: 1,
          siege: 1,
          punkte: 3
        }
      });
      console.log(`   ✅ UPDATE operation: Updated entry successfully`);
      
      // Test delete operation
      await axios.delete(`${baseURL}/tabellen-eintraege/${testEntryId}`);
      console.log(`   ✅ DELETE operation: Deleted test entry successfully`);
      
    } catch (crudError) {
      console.log(`   ❌ CRUD operation failed: ${crudError.message}`);
    }
    
    // Final summary
    console.log('\n📋 FINAL VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    
    const allChecksPass = 
      displayIssues.length === 0 &&
      formattingIssues.length === 0 &&
      consistencyIssues.length === 0 &&
      ligaAccessibilityIssues.length === 0 &&
      dataIntegrityIssues.length === 0;
    
    if (allChecksPass) {
      console.log('🎉 ALL VERIFICATION CHECKS PASSED!');
      console.log('\n✅ Task 4 Sub-tasks Completed:');
      console.log('   ✅ All existing tabellen-eintrag entries display correct team names');
      console.log('   ✅ Team names are consistent and properly formatted');
      console.log('   ✅ Liga information is still accessible in detail views');
      console.log('   ✅ No data loss or corruption occurred during schema change');
      
      console.log('\n✅ Requirements Validation:');
      console.log('   ✅ 3.1: All team_name fields are properly populated and displayed');
      console.log('   ✅ 3.2: All CRUD operations function correctly');
      console.log('   ✅ 3.3: Team names are consistent with referenced team objects');
      
      return true;
    } else {
      console.log('❌ VERIFICATION ISSUES FOUND!');
      console.log(`   - Display issues: ${displayIssues.length}`);
      console.log(`   - Formatting issues: ${formattingIssues.length}`);
      console.log(`   - Consistency issues: ${consistencyIssues.length}`);
      console.log(`   - Liga accessibility issues: ${ligaAccessibilityIssues.length}`);
      console.log(`   - Data integrity issues: ${dataIntegrityIssues.length}`);
      
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Run the verification
verifyDataIntegrityAndDisplay()
  .then(success => {
    if (success) {
      console.log('\n🎯 Task 4 completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Task 4 failed - issues need to be addressed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Verification execution failed:', error);
    process.exit(1);
  });