#!/usr/bin/env node

/**
 * Test scraper with real players from the database
 */

import connectDB from './database.js';
import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';
import fargoScraperServiceNew from './src/services/fargoScraperServiceNew.js';

async function testRealPlayersScraper() {
  try {
    console.log('🧪 Testing Scraper with Real Players');
    console.log('====================================\n');

    // Use the same connection method as the server
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get real players from the 499-under ladder
    console.log('📋 Getting players from 499-under ladder...');
    const players = await LadderPlayer.find({ ladderName: '499-under' }).limit(5);
    
    console.log(`📊 Found ${players.length} players in 499-under ladder:`);
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

    console.log('\n🎉 All real player tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
testRealPlayersScraper().catch(console.error);
