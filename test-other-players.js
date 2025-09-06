#!/usr/bin/env node

/**
 * Test the scraper with other player names
 */

import fargoScraperServiceNew from './src/services/fargoScraperServiceNew.js';

async function testOtherPlayers() {
  try {
    console.log('🧪 Testing Scraper with Other Player Names');
    console.log('==========================================\n');

    // Test with different players to avoid rate limiting
    const testPlayers = [
      { firstName: 'John', lastName: 'Smith' },
      { firstName: 'Mike', lastName: 'Johnson' },
      { firstName: 'Sarah', lastName: 'Williams' },
      { firstName: 'David', lastName: 'Brown' },
      { firstName: 'Lisa', lastName: 'Davis' }
    ];

    for (let i = 0; i < testPlayers.length; i++) {
      const player = testPlayers[i];
      console.log(`\n🔍 Testing ${i + 1}/${testPlayers.length}: ${player.firstName} ${player.lastName}`);
      
      const result = await fargoScraperServiceNew.testScraper(player.firstName, player.lastName);
      
      if (result) {
        console.log(`✅ SUCCESS: Found ${result.name} with rating ${result.rating}`);
      } else {
        console.log(`❌ FAILED: Could not find ${player.firstName} ${player.lastName}`);
      }
      
      // Wait between searches to be respectful to the server
      if (i < testPlayers.length - 1) {
        console.log('⏳ Waiting 10 seconds before next search...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    console.log('\n🎉 All tests completed!');
    console.log('\nNow let\'s try Tom Barnard one more time...');
    
    // Wait a bit longer before trying Tom Barnard again
    console.log('⏳ Waiting 15 seconds before testing Tom Barnard...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('\n🔍 Testing Tom Barnard...');
    const tomResult = await fargoScraperServiceNew.testScraper('Tom', 'Barnard');
    
    if (tomResult) {
      console.log(`\n✅ SUCCESS! Found Tom Barnard:`);
      console.log(`   Name: ${tomResult.name}`);
      console.log(`   Rating: ${tomResult.rating}`);
      console.log(`   Source: ${tomResult.source}`);
      
      if (tomResult.rating === 514) {
        console.log('\n🎉 PERFECT! Found the correct rating (514)!');
      } else {
        console.log(`\n⚠️ Found rating ${tomResult.rating}, but expected 514`);
      }
    } else {
      console.log('\n❌ FAILED: Could not find Tom Barnard');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOtherPlayers().catch(console.error);
