/**
 * Test Script für CSV Import
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE_PATH = path.join(__dirname, '../public/Spielerliste.csv');

console.log('🔍 Testing CSV Import...');
console.log('CSV File Path:', CSV_FILE_PATH);
console.log('File exists:', fs.existsSync(CSV_FILE_PATH));

if (fs.existsSync(CSV_FILE_PATH)) {
  const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  console.log('File content length:', csvContent.length);
  console.log('First 200 characters:');
  console.log(csvContent.substring(0, 200));
  
  const lines = csvContent.trim().split('\n');
  console.log('Number of lines:', lines.length);
  console.log('First line (header):', lines[0]);
  if (lines.length > 1) {
    console.log('Second line (first data):', lines[1]);
  }
}