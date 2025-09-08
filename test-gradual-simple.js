#!/usr/bin/env node

/**
 * Simple test for gradual update system (without scraper)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fargoScraperService from './src/services/fargoScraperService.js';

dotenv.config();

async function testGradualSimple() {
  try {
    console.log('🧪 Testing Gradual Update System (Simple)');
    console.log('=========================================\n');

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

    // Test 2: Save and retrieve player index
    console.log('\n💾 Test 2: Testing index persistence...');
    try {
      const testIndex = 10;
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

    // Test 3: Reset index
    console.log('\n🔄 Test 3: Testing index reset...');
    try {
      await fargoScraperService.savePlayerIndex('499-under', 0);
      const resetIndex = await fargoScraperService.getNextPlayerIndex('499-under');
      console.log(`✅ Index reset to: ${resetIndex}`);
    } catch (error) {
      console.log(`❌ Error resetting index: ${error.message}`);
    }

    console.log('\n🎉 Gradual Update System Test Complete!');
    console.log('\n📋 How it works:');
    console.log('- Runs every 6 hours automatically');
    console.log('- Updates 1 player per run');
    console.log('- Cycles through all players');
    console.log('- Saves progress between runs');
    console.log('- Very respectful to FargoRate');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

// Run the test
testGradualSimple().catch(console.error);


