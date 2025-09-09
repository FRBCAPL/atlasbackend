#!/usr/bin/env node

/**
 * Test searching for a single player
 */

import dotenv from 'dotenv';
import fargoScraperService from './src/services/fargoScraperService.js';

dotenv.config();

async function testSinglePlayer() {
  try {
    console.log('🧪 Testing Single Player Search');
    console.log('===============================\n');

    // Test with a common name that might be in FargoRate
    const testPlayer = 'Brett Gonzalez';
    console.log(`Searching for: ${testPlayer}`);

    const result = await fargoScraperService.testScraper(testPlayer);
    
    if (result) {
      console.log('✅ Player found!');
      console.log(`   Name: ${result.name}`);
      console.log(`   Rating: ${result.rating}`);
      console.log(`   Source: ${result.source}`);
      console.log(`   Last Updated: ${result.lastUpdated}`);
    } else {
      console.log('❌ Player not found');
    }

    console.log('\n🎯 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSinglePlayer().catch(console.error);



