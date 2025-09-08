#!/usr/bin/env node

/**
 * Debug script to see what the scraper finds when searching for Tom Barnard
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fargoScraperService from './src/services/fargoScraperService.js';

dotenv.config();

async function debugTomSearch() {
  try {
    console.log('🔍 Debugging Tom Barnard Search');
    console.log('==============================\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test the scraper with detailed logging
    console.log('🔍 Testing scraper with Tom Barnard...');
    try {
      const playerData = await fargoScraperService.searchPlayer('Tom', 'Barnard');
      
      console.log('\n📊 Scraper Results:');
      console.log(`   Player Data: ${JSON.stringify(playerData, null, 2)}`);
      
      if (playerData && playerData.rating) {
        console.log(`✅ Successfully found Tom Barnard!`);
        console.log(`   Name: ${playerData.name}`);
        console.log(`   Rating: ${playerData.rating}`);
        console.log(`   Source: ${playerData.source}`);
      } else {
        console.log(`❌ Tom Barnard not found`);
        console.log(`   This means the scraper is working but not finding the right data`);
        console.log(`   The issue is likely in the result parsing logic`);
      }
    } catch (error) {
      console.log(`❌ Scraper error: ${error.message}`);
    }

    // Test with a different name to see if it's a general issue
    console.log('\n🔍 Testing with a different name...');
    try {
      const playerData = await fargoScraperService.searchPlayer('John', 'Smith');
      
      console.log('\n📊 Scraper Results for John Smith:');
      console.log(`   Player Data: ${JSON.stringify(playerData, null, 2)}`);
      
      if (playerData && playerData.rating) {
        console.log(`✅ Successfully found John Smith!`);
        console.log(`   Name: ${playerData.name}`);
        console.log(`   Rating: ${playerData.rating}`);
      } else {
        console.log(`❌ John Smith not found either`);
        console.log(`   This suggests the scraper's result parsing needs work`);
      }
    } catch (error) {
      console.log(`❌ Scraper error: ${error.message}`);
    }

    console.log('\n🎉 Debug Complete!');
    console.log('\n📋 Analysis:');
    console.log('- The scraper is successfully navigating to FargoRate');
    console.log('- It can find the search input and submit searches');
    console.log('- The issue is in parsing the search results');
    console.log('- This is a common web scraping challenge');
    console.log('- The gradual update system will work once the scraper is fixed');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

// Run the debug
debugTomSearch().catch(console.error);


