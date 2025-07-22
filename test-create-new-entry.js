const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function testCreateNewEntry() {
  try {
    console.log('Testing creation of new entry with logo...');
    
    // Create a completely new entry to test if the schema works
    const newEntryData = {
      data: {
        position: 99,
        teamname: 'Test Team Logo',
        spiele: 10,
        siege: 5,
        unentschieden: 3,
        niederlagen: 2,
        tore: 15,
        gegentore: 10,
        tordifferenz: 5,
        