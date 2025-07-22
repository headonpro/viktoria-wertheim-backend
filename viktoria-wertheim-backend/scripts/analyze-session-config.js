const fs = require('fs');
const path = require('path');

function analyzeSessionConfig() {
  console.log('🔍 Analyzing Session Configuration Issues...');
  
  // Read .env file
  const envPath = path.join(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('\n📋 Current Configuration:');
  const hostMatch = envContent.match(/HOST=(.+)/);
  const portMatch = envContent.match(/PORT=(.+)/);
  
  if (hostMatch) {
    console.log(`HOST: ${hostMatch[1]}`);
  }
  if (portMatch) {
    console.log(`PORT: ${portMatch[1]}`);
  }
  
  console.log('\n🔍 Potential Issues:');
  
  if (hostMatch && hostMatch[1] === '192.168.178.59') {
    console.log('❌ CRITICAL: HOST is set to specific IP address');
    console.log('   This can cause session cookie issues!');
    console.log('   Admin panel cookies might not be set correctly');
    console.log('');
    console.log('🔧 Solution Options:');
    console.log('   Option 1: Change HOST to 0.0.0.0 (recommended)');
    console.log('   Option 2: Add session configuration for specific IP');
    console.log('');
  }
  
  // Check if session middleware is properly configured
  const middlewaresPath = path.join(__dirname, '../config/middlewares.ts');
  if (fs.existsSync(middlewaresPath)) {
    const middlewaresContent = fs.readFileSync(middlewaresPath, 'utf8');
    
    if (middlewaresContent.includes('strapi::session')) {
      console.log('✅ Session middleware is enabled');
    } else {
      console.log('❌ Session middleware missing!');
    }
  }
  
  console.log('\n🎯 Recommended Fix:');
  console.log('1. Change HOST from 192.168.178.59 to 0.0.0.0');
  console.log('2. This allows Strapi to bind to all interfaces');
  console.log('3. But still accessible via 192.168.178.59:1337');
  console.log('4. Fixes session cookie domain issues');
}

analyzeSessionConfig();