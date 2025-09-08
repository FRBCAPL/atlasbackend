#!/usr/bin/env node

/**
 * Test the gradual Fargo rating update system
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fargoScraperService from './src/services/fargoScraperService.js';

dotenv.config();

async function testGradualUpdate() {
  try {
    console.log('🧪 Testing Gradual Fargo Rating Update System');
    console.log('=============================================\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Get current player index
    console.log('📊 Test 1: Getting current player index...');
    try {
      const index = await fargoScraperService.getNextPlayerIndex('499-under');
      console.log(`✅ Current player index: ${index}`);
    } catch (error) {
      console.log(`❌ Error getting index: ${error.message}`);
    }

    // Test 2: Update a single player
    console.log('\n🔄 Test 2: Updating a single player...');
    try {
      const result = await fargoScraperService.updateSinglePlayer('499-under', 0);
      
      if (result.success) {
        console.log(`✅ Player update successful:`);
        console.log(`   Player: ${result.player}`);
        console.log(`   Old Rating: ${result.oldRating}`);
        console.log(`   New Rating: ${result.newRating}`);
        console.log(`   Next Index: ${result.nextIndex}`);
        
        if (result.noChange) {
          console.log(`   Status: No rating change`);
        } else if (result.oldRating !== result.newRating) {
          console.log(`   Status: Rating updated!`);
        }
      } else {
        console.log(`❌ Player update failed: ${result.reason}`);
      }
    } catch (error) {
      console.log(`❌ Error updating player: ${error.message}`);
    }

    // Test 3: Save and retrieve player index
    console.log('\n💾 Test 3: Testing index persistence...');
    try {
      const testIndex = 5;
      await fargoScraperService.savePlayerIndex('499-under', testIndex);
      console.log(`✅ Saved index: ${testIndex}`);
      
      const retrievedIndex = await fargoScraperService.getNextPlayerIndex('499-under');
      console.log(`✅ Retrieved index: ${retrievedIndex}`);
      
      if (retrievedIndex === testIndex) {
        console.log(`✅ Index persistence working correctly`);
      } else {
        console.log(`❌ Index persistence failed`);
      }
    } catch (error) {
      console.log(`❌ Error testing index persistence: ${error.message}`);
    }

    // Test 4: Cycle through a few players
    console.log('\n🔄 Test 4: Cycling through multiple players...');
    try {
      for (let i = 0; i < 3; i++) {
        console.log(`\n   Updating player ${i + 1}/3...`);
        const result = await fargoScraperService.updateSinglePlayer('499-under', i);
        
        if (result.success) {
          console.log(`   ✅ ${result.player}: ${result.oldRating} → ${result.newRating}`);
        } else {
          console.log(`   ❌ Failed: ${result.reason}`);
        }
        
        // Small delay between players
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log(`❌ Error cycling through players: ${error.message}`);
    }

    console.log('\n🎉 Gradual Update System Test Complete!');
    console.log('\n📋 Summary:');
    console.log('- Gradual updates will run every 6 hours');
    console.log('- Each run updates 1 player');
    console.log('- System cycles through all players');
    console.log('- Index is saved between runs');
    console.log('- Very respectful to FargoRate servers');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

// Run the test
testGradualUpdate().catch(console.error);


