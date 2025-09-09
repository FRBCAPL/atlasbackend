#!/usr/bin/env node

/**
 * Test with common pool player names that are likely on FargoRate
 */

import fargoScraperServiceNew from './src/services/fargoScraperServiceNew.js';

async function testCommonPoolPlayers() {
  try {
    console.log('🧪 Testing with Common Pool Players');
    console.log('===================================\n');

    // Test with common pool player names that are likely to exist on FargoRate
    const commonPlayers = [
      { firstName: 'Shane', lastName: 'Van Boening' },
      { firstName: 'Efren', lastName: 'Reyes' },
      { firstName: 'Johnny', lastName: 'Archer' },
      { firstName: 'Earl', lastName: 'Strickland' },
      { firstName: 'Mike', lastName: 'Sigel' }
    ];

    for (let i = 0; i < commonPlayers.length; i++) {
      const player = commonPlayers[i];
      console.log(`\n🔍 Testing ${i + 1}/${commonPlayers.length}: ${player.firstName} ${player.lastName}`);
      
      const result = await fargoScraperServiceNew.testScraper(player.firstName, player.lastName);
      
      if (result) {
        console.log(`✅ SUCCESS: Found ${result.name} with rating ${result.rating}`);
        console.log(`   Source: ${result.source}`);
      } else {
        console.log(`❌ FAILED: Could not find ${player.firstName} ${player.lastName}`);
      }
      
      // Wait between searches to be respectful to the server
      if (i < commonPlayers.length - 1) {
        console.log('⏳ Waiting 15 seconds before next search...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }

    console.log('\n🎉 All common pool player tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCommonPoolPlayers().catch(console.error);


