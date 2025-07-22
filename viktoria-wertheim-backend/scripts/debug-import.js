/**
 * Debug Script für Import
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';

async function testConnection() {
  console.log('🔍 Testing Strapi connection...');
  
  try {
    const response = await axios.get(`${STRAPI_URL}/api/spielers`);
    console.log('✅ Strapi connection successful');
    console.log('Response status:', response.status);
    console.log('Data length:', response.data.data ? response.data.data.length : 'No data');
    return true;
  } catch (error) {
    console.error('❌ Strapi connection failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return false;
  }
}

async function testMitgliedEndpoint() {
  console.log('🔍 Testing Mitglied endpoint...');
  
  try {
    const response = await axios.get(`${STRAPI_URL}/api/mitglieds`);
    console.log('✅ Mitglied endpoint successful');
    console.log('Response status:', response.status);
    return true;
  } catch (error) {
    console.error('❌ Mitglied endpoint failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return false;
  }
}

async function testMannschaftEndpoint() {
  console.log('🔍 Testing Mannschaft endpoint...');
  
  try {
    const response = await axios.get(`${STRAPI_URL}/api/mannschaften`);
    console.log('✅ Mannschaft endpoint successful');
    console.log('Response status:', response.status);
    console.log('Teams found:', response.data.data ? response.data.data.length : 'No data');
    if (response.data.data && response.data.data.length > 0) {
      console.log('First team:', response.data.data[0].attributes.name);
    }
    return true;
  } catch (error) {
    console.error('❌ Mannschaft endpoint failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting debug tests...\n');
  
  await testConnection();
  console.log('');
  await testMitgliedEndpoint();
  console.log('');
  await testMannschaftEndpoint();
  
  console.log('\n✅ Debug tests completed');
}

runTests();