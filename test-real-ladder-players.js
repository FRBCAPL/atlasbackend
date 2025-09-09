#!/usr/bin/env node

/**
 * Test with actual players from the ladder database
 */

import mongoose from 'mongoose';
import fargoScraperServiceNew from './src/services/fargoScraperServiceNew.js';

// Import the LadderPlayer model
import LadderPlayer from './src/models/LadderPlayer.js';

async function testRealLadderPlayers() {
  try {
    console.log('🧪 Testing with Real Ladder Players');
    console.log('===================================\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/frontrangepoolhub');
    console.log('✅ Connected to MongoDB');

    // Get actual players from the ladder
    console.log('📋 Getting players from 499-under ladder...');
    const players = await LadderPlayer.find({ ladderName: '499-under' }).limit(5);
    
    if (players.length === 0) {
      console.log('❌ No players found in 499-under ladder');
      return;
    }

    console.log(`📊 Found ${players.length} players in the ladder:`);
    players.forEach((player, index) => {
      console.log(`   ${index + 1}. ${player.firstName} ${player.lastName} (Rating: ${player.fargoRate})`);
    });

    console.log('\n🔍 Testing scraper with real ladder players...\n');

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      console.log(`\n🔍 Testing ${i + 1}/${players.length}: ${player.firstName} ${player.lastName}`);
      console.log(`   Current rating in database: ${player.fargoRate}`);
      
      const result = await fargoScraperServiceNew.testScraper(player.firstName, player.lastName);
      
      if (result) {
        console.log(`✅ SUCCESS: Found ${result.name} with rating ${result.rating}`);
        console.log(`   Source: ${result.source}`);
        
        if (result.rating !== player.fargoRate) {
          console.log(`   🎯 Rating difference detected: ${player.fargoRate} → ${result.rating}`);
        } else {
          console.log(`   ✅ Rating matches database`);
        }
      } else {
        console.log(`❌ FAILED: Could not find ${player.firstName} ${player.lastName}`);
      }
      
      // Wait between searches to be respectful to the server
      if (i < players.length - 1) {
        console.log('⏳ Waiting 15 seconds before next search...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }

    console.log('\n🎉 All real ladder player tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testRealLadderPlayers().catch(console.error);


