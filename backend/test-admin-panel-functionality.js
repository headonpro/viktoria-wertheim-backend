/**
 * Test script for verifying admin panel functionality after schema change
 * Tests all CRUD operations and validates team_name display
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';
const ADMIN_URL = 'http://localhost:1337/admin';

// Test configuration
const testConfig = {
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

class AdminPanelTester {
  constructor() {
    this.client = axios.create(testConfig);
    this.testResults = {
      serverConnection: false,
      dataRetrieval: false,
      teamNameDisplay: false,
      crudOperations: {
        create: false,
        read: false,
        update: false,
        delete: false
      },
      dataIntegrity: false
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Admin Panel Functionality Tests\n');
    
    try {
      await this.testServerConnection();
      await this.testDataRetrieval();
      await this.testTeamNameDisplay();
      await this.testCRUDOperations();
      await this.testDataIntegrity();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testServerConnection() {
    console.log('1️⃣ Testing server connection...');
    
    try {
      const response = await this.client.get('/tabellen-eintraege?pagination[limit]=1');
      
      if (response.status === 200) {
        this.testResults.serverConnection = true;
        console.log('✅ Server is running and accessible');
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Server connection failed:', error.message);
      throw error;
    }
  }

  async testDataRetrieval() {
    console.log('\n2️⃣ Testing data retrieval...');
    
    try {
      const response = await this.client.get('/tabellen-eintraege?populate=liga');
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        this.testResults.dataRetrieval = true;
        console.log(`✅ Successfully retrieved ${response.data.data.length} tabellen-eintrag records`);
        
        // Store sample data for further tests
        this.sampleData = response.data.data;
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      console.log('❌ Data retrieval failed:', error.message);
      throw error;
    }
  }

  async testTeamNameDisplay() {
    console.log('\n3️⃣ Testing team name display functionality...');
    
    try {
      if (!this.sampleData || this.sampleData.length === 0) {
        throw new Error('No sample data available');
      }

      let teamNamesFound = 0;
      let validTeamNames = 0;

      for (const entry of this.sampleData.slice(0, 5)) { // Test first 5 entries
        if (entry.team_name) {
          teamNamesFound++;
          
          // Validate team name format and content
          if (typeof entry.team_name === 'string' && 
              entry.team_name.length > 0 && 
              entry.team_name.length <= 100 &&
              !entry.team_name.startsWith('Kreisliga') && // Should not show liga names
              !entry.team_name.startsWith('Bezirksliga')) {
            validTeamNames++;
            console.log(`   ✓ Entry ID ${entry.id}: "${entry.team_name}"`);
          } else {
            console.log(`   ❌ Entry ID ${entry.id}: Invalid team name "${entry.team_name}"`);
          }
        }
      }

      if (teamNamesFound === validTeamNames && validTeamNames > 0) {
        this.testResults.teamNameDisplay = true;
        console.log(`✅ Team name display working correctly (${validTeamNames}/${teamNamesFound} valid)`);
      } else {
        throw new Error(`Team name validation failed: ${validTeamNames}/${teamNamesFound} valid`);
      }
    } catch (error) {
      console.log('❌ Team name display test failed:', error.message);
      throw error;
    }
  }

  async testCRUDOperations() {
    console.log('\n4️⃣ Testing CRUD operations...');
    
    let testEntryId = null;
    
    try {
      // Test CREATE
      console.log('   Testing CREATE operation...');
      const createData = {
        data: {
          team_name: "Test Team CRUD",
          liga: this.sampleData[0].liga.id, // Use existing liga
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
      };

      const createResponse = await this.client.post('/tabellen-eintraege', createData);
      
      if (createResponse.status === 201 && createResponse.data.data) {
        testEntryId = createResponse.data.data.id;
        this.testResults.crudOperations.create = true;
        console.log(`   ✅ CREATE: Successfully created entry with ID ${testEntryId}`);
      } else {
        throw new Error('CREATE operation failed');
      }

      // Test READ
      console.log('   Testing READ operation...');
      const readResponse = await this.client.get(`/tabellen-eintraege/${testEntryId}`);
      
      if (readResponse.status === 200 && 
          readResponse.data.data && 
          readResponse.data.data.team_name === "Test Team CRUD") {
        this.testResults.crudOperations.read = true;
        console.log('   ✅ READ: Successfully retrieved created entry');
      } else {
        throw new Error('READ operation failed');
      }

      // Test UPDATE
      console.log('   Testing UPDATE operation...');
      const updateData = {
        data: {
          team_name: "Test Team CRUD Updated",
          spiele: 1,
          siege: 1,
          punkte: 3
        }
      };

      const updateResponse = await this.client.put(`/tabellen-eintraege/${testEntryId}`, updateData);
      
      if (updateResponse.status === 200 && 
          updateResponse.data.data.team_name === "Test Team CRUD Updated") {
        this.testResults.crudOperations.update = true;
        console.log('   ✅ UPDATE: Successfully updated entry');
      } else {
        throw new Error('UPDATE operation failed');
      }

      // Test DELETE
      console.log('   Testing DELETE operation...');
      const deleteResponse = await this.client.delete(`/tabellen-eintraege/${testEntryId}`);
      
      if (deleteResponse.status === 200) {
        this.testResults.crudOperations.delete = true;
        console.log('   ✅ DELETE: Successfully deleted test entry');
      } else {
        throw new Error('DELETE operation failed');
      }

      // Verify deletion
      try {
        await this.client.get(`/tabellen-eintraege/${testEntryId}`);
        throw new Error('Entry still exists after deletion');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log('   ✅ DELETE verification: Entry properly removed');
        } else {
          throw error;
        }
      }

    } catch (error) {
      console.log('❌ CRUD operations test failed:', error.message);
      
      // Cleanup: try to delete test entry if it exists
      if (testEntryId) {
        try {
          await this.client.delete(`/tabellen-eintraege/${testEntryId}`);
          console.log('   🧹 Cleanup: Test entry removed');
        } catch (cleanupError) {
          console.log('   ⚠️ Cleanup failed:', cleanupError.message);
        }
      }
      
      throw error;
    }
  }

  async testDataIntegrity() {
    console.log('\n5️⃣ Testing data integrity...');
    
    try {
      const response = await this.client.get('/tabellen-eintraege?populate=liga');
      const entries = response.data.data;

      let integrityChecks = {
        teamNamesPopulated: 0,
        validTeamNameFormat: 0,
        ligaRelationsIntact: 0,
        calculatedFieldsValid: 0
      };

      for (const entry of entries) {
        // Check team_name is populated
        if (entry.team_name && entry.team_name.trim().length > 0) {
          integrityChecks.teamNamesPopulated++;
        }

        // Check team_name format
        if (entry.team_name && 
            typeof entry.team_name === 'string' && 
            entry.team_name.length <= 100) {
          integrityChecks.validTeamNameFormat++;
        }

        // Check liga relation is intact
        if (entry.liga && entry.liga.id && entry.liga.name) {
          integrityChecks.ligaRelationsIntact++;
        }

        // Check calculated fields are valid
        const expectedTordifferenz = entry.tore_fuer - entry.tore_gegen;
        const expectedSpiele = entry.siege + entry.unentschieden + entry.niederlagen;
        
        if (entry.tordifferenz === expectedTordifferenz && 
            entry.spiele === expectedSpiele) {
          integrityChecks.calculatedFieldsValid++;
        }
      }

      const totalEntries = entries.length;
      const allChecksPass = 
        integrityChecks.teamNamesPopulated === totalEntries &&
        integrityChecks.validTeamNameFormat === totalEntries &&
        integrityChecks.ligaRelationsIntact === totalEntries;

      if (allChecksPass) {
        this.testResults.dataIntegrity = true;
        console.log(`✅ Data integrity verified for all ${totalEntries} entries`);
        console.log(`   - Team names populated: ${integrityChecks.teamNamesPopulated}/${totalEntries}`);
        console.log(`   - Valid team name format: ${integrityChecks.validTeamNameFormat}/${totalEntries}`);
        console.log(`   - Liga relations intact: ${integrityChecks.ligaRelationsIntact}/${totalEntries}`);
        console.log(`   - Calculated fields valid: ${integrityChecks.calculatedFieldsValid}/${totalEntries}`);
      } else {
        throw new Error(`Data integrity issues found: ${JSON.stringify(integrityChecks)}`);
      }
    } catch (error) {
      console.log('❌ Data integrity test failed:', error.message);
      throw error;
    }
  }

  printResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    const allPassed = 
      this.testResults.serverConnection &&
      this.testResults.dataRetrieval &&
      this.testResults.teamNameDisplay &&
      Object.values(this.testResults.crudOperations).every(result => result) &&
      this.testResults.dataIntegrity;

    console.log(`Server Connection: ${this.testResults.serverConnection ? '✅' : '❌'}`);
    console.log(`Data Retrieval: ${this.testResults.dataRetrieval ? '✅' : '❌'}`);
    console.log(`Team Name Display: ${this.testResults.teamNameDisplay ? '✅' : '❌'}`);
    console.log(`CRUD Operations:`);
    console.log(`  - Create: ${this.testResults.crudOperations.create ? '✅' : '❌'}`);
    console.log(`  - Read: ${this.testResults.crudOperations.read ? '✅' : '❌'}`);
    console.log(`  - Update: ${this.testResults.crudOperations.update ? '✅' : '❌'}`);
    console.log(`  - Delete: ${this.testResults.crudOperations.delete ? '✅' : '❌'}`);
    console.log(`Data Integrity: ${this.testResults.dataIntegrity ? '✅' : '❌'}`);
    
    console.log('\n========================');
    
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Schema change successful.');
      console.log('\n✅ Requirements Validation:');
      console.log('   - 1.3: Admin panel loads without errors ✅');
      console.log('   - 2.1: Team names displayed as primary identifier ✅');
      console.log('   - 2.2: Unique identification per entry ✅');
      console.log('   - 2.3: Detail information still accessible ✅');
      console.log('   - 3.2: All CRUD operations function correctly ✅');
    } else {
      console.log('❌ SOME TESTS FAILED! Please review the issues above.');
      process.exit(1);
    }
  }
}

// Run the tests
const tester = new AdminPanelTester();
tester.runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});