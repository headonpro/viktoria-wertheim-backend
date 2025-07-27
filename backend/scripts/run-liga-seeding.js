#!/usr/bin/env node

/**
 * Liga-Tabellen Seeding Runner
 * Simple script to run the liga tabellen seeding
 */

const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log('🚀 Liga-Tabellen Seeding Runner');
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);

// Import and run the seeding script
const { seedLigaTabellen } = require('./seed-liga-tabellen');

seedLigaTabellen()
  .then(() => {
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });