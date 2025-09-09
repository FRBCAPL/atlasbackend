#!/usr/bin/env node

/**
 * Test the fixed scraper with Tom Barnard
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fargoScraperService from './src/services/fargoScraperService.js';

dotenv.config();

async function testTomFixed() {
  try {
    console.log('🧪 Testing Fixed Scraper with Tom Barnard');
    console.log('=========================================\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test the scraper with Tom Barnard
    console.log('🔍 Testing scraper with Tom Barnard...');
    try {
      const playerData = await fargoScraperService.searchPlayer('Tom', 'Barnard');
      
      if (playerData && playerData.rating) {
        console.log(`✅ SUCCESS! Found Tom Barnard:`);
        console.log(`   Name: ${playerData.name}`);
        console.log(`   Rating: ${playerData.rating}`);
        console.log(`   Source: ${playerData.source}`);
        console.log(`\n🎉 The scraper is now working!`);
        console.log(`   Tom's current rating on FargoRate: ${playerData.rating}`);
        console.log(`   Tom's rating in our database: 488`);
        
        if (playerData.rating !== 488) {
          console.log(`   🎯 Rating difference detected!`);
          console.log(`   Database needs update: 488 → ${playerData.rating}`);
        } else {
          console.log(`   ✅ Rating is current (no update needed)`);
        }
      } else {
        console.log(`❌ Still not finding Tom Barnard`);
        console.log(`   The scraper may need further adjustment`);
      }
    } catch (error) {
      console.log(`❌ Scraper error: ${error.message}`);
    }

    console.log('\n🎉 Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

// Run the test
testTomFixed().catch(console.error);



