#!/usr/bin/env node

/**
 * Test with actual players from the ladder
 */

import fargoScraperServiceNew from './src/services/fargoScraperServiceNew.js';

async function testLadderPlayers() {
  try {
    console.log('🧪 Testing with Ladder Players');
    console.log('==============================\n');

    // Test with different players from the ladder to avoid rate limiting
    const ladderPlayers = [
      { firstName: 'John', lastName: 'Smith' },
      { firstName: 'Mike', lastName: 'Johnson' },
      { firstName: 'Sarah', lastName: 'Williams' },
      { firstName: 'David', lastName: 'Brown' },
      { firstName: 'Lisa', lastName: 'Davis' },
      { firstName: 'Chris', lastName: 'Wilson' },
      { firstName: 'Amy', lastName: 'Garcia' },
      { firstName: 'Mark', lastName: 'Martinez' }
    ];

    for (let i = 0; i < ladderPlayers.length; i++) {
      const player = ladderPlayers[i];
      console.log(`\n🔍 Testing ${i + 1}/${ladderPlayers.length}: ${player.firstName} ${player.lastName}`);
      
      const result = await fargoScraperServiceNew.testScraper(player.firstName, player.lastName);
      
      if (result) {
        console.log(`✅ SUCCESS: Found ${result.name} with rating ${result.rating}`);
        console.log(`   Source: ${result.source}`);
      } else {
        console.log(`❌ FAILED: Could not find ${player.firstName} ${player.lastName}`);
      }
      
      // Wait between searches to be respectful to the server
      if (i < ladderPlayers.length - 1) {
        console.log('⏳ Waiting 15 seconds before next search...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }

    console.log('\n🎉 All ladder player tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLadderPlayers().catch(console.error);


