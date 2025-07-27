#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';

async function testConnection() {
  try {
    console.log('Testing connection to Strapi...');
    
    // Test game-cards endpoint
    const gameCardsResponse = await axios.get(`${API_BASE_URL}/game-cards`);
    console.log(`Game Cards found: ${gameCardsResponse.data.data.length}`);
    
    if (gameCardsResponse.data.data.length > 0) {
      console.log('Sample game card:', gameCardsResponse.data.data[0]);
    }
    
    // Test next-game-cards endpoint
    const nextGameCardsResponse = await axios.get(`${API_BASE_URL}/next-game-cards`);
    console.log(`Next Game Cards found: ${nextGameCardsResponse.data.data.length}`);
    
    if (nextGameCardsResponse.data.data.length > 0) {
      console.log('Sample next game card:', nextGameCardsResponse.data.data[0]);
    }
    
  } catch (error) {
    console.error('Connection failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testConnection();