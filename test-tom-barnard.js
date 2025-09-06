#!/usr/bin/env node

/**
 * Test the gradual update system with Tom Barnard specifically
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fargoScraperService from './src/services/fargoScraperService.js';

dotenv.config();

async function testTomBarnard() {
  try {
    console.log('🧪 Testing Gradual Update with Tom Barnard');
    console.log('==========================================\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Search for Tom Barnard specifically
    console.log('🔍 Test 1: Searching for Tom Barnard on FargoRate...');
    try {
      const playerData = await fargoScraperService.searchPlayer('Tom', 'Barnard');
      
      if (playerData && playerData.rating) {
        console.log(`✅ Found Tom Barnard!`);
        console.log(`   Name: ${playerData.name}`);
        console.log(`   Rating: ${playerData.rating}`);
        console.log(`   Source: ${playerData.source}`);
      } else {
        console.log(`❌ Tom Barnard not found on FargoRate`);
        console.log(`   This could mean:`);
        console.log(`   - Name is spelled differently`);
        console.log(`   - Not in FargoRate database`);
        console.log(`   - Scraper needs adjustment`);
      }
    } catch (error) {
      console.log(`❌ Error searching for Tom Barnard: ${error.message}`);
    }

    // Test 2: Check if Tom Barnard is in our database
    console.log('\n📊 Test 2: Checking if Tom Barnard is in our database...');
    try {
      // Import the fargoUpdateService to get current ratings
      const fargoUpdateService = await import('./src/services/fargoUpdateService.js');
      const players = await fargoUpdateService.default.getCurrentRatings('499-under');
      const tomPlayer = players.find(p => 
        p.name.toLowerCase().includes('tom') && 
        p.name.toLowerCase().includes('barnard')
      );
      
      if (tomPlayer) {
        console.log(`✅ Found Tom Barnard in our database:`);
        console.log(`   Name: ${tomPlayer.name}`);
        console.log(`   Current Rating: ${tomPlayer.fargoRate || 'No Rating'}`);
        console.log(`   Position: ${tomPlayer.position}`);
      } else {
        console.log(`❌ Tom Barnard not found in our database`);
        console.log(`   Available players:`);
        players.slice(0, 5).forEach(p => {
          console.log(`   - ${p.name} (Rating: ${p.fargoRate || 'No Rating'})`);
        });
        if (players.length > 5) {
          console.log(`   ... and ${players.length - 5} more players`);
        }
      }
    } catch (error) {
      console.log(`❌ Error checking database: ${error.message}`);
    }

    // Test 3: Try to update Tom Barnard if found
    console.log('\n🔄 Test 3: Attempting to update Tom Barnard...');
    try {
      const fargoUpdateService = await import('./src/services/fargoUpdateService.js');
      const players = await fargoUpdateService.default.getCurrentRatings('499-under');
      const tomPlayer = players.find(p => 
        p.name.toLowerCase().includes('tom') && 
        p.name.toLowerCase().includes('barnard')
      );
      
      if (tomPlayer) {
        console.log(`Found Tom Barnard, attempting update...`);
        const result = await fargoScraperService.updateSinglePlayer('499-under', players.indexOf(tomPlayer));
        
        if (result.success) {
          console.log(`✅ Update successful:`);
          console.log(`   Player: ${result.player}`);
          console.log(`   Old Rating: ${result.oldRating}`);
          console.log(`   New Rating: ${result.newRating}`);
          console.log(`   Next Index: ${result.nextIndex}`);
        } else {
          console.log(`❌ Update failed: ${result.reason}`);
        }
      } else {
        console.log(`❌ Cannot update - Tom Barnard not found in database`);
      }
    } catch (error) {
      console.log(`❌ Error updating Tom Barnard: ${error.message}`);
    }

    // Test 4: Test the scraper with a known player name
    console.log('\n🔍 Test 4: Testing scraper with common name...');
    try {
      const playerData = await fargoScraperService.searchPlayer('John', 'Smith');
      
      if (playerData && playerData.rating) {
        console.log(`✅ Scraper working - found John Smith:`);
        console.log(`   Rating: ${playerData.rating}`);
      } else {
        console.log(`❌ Scraper not working - John Smith not found`);
      }
    } catch (error) {
      console.log(`❌ Scraper error: ${error.message}`);
    }

    console.log('\n🎉 Tom Barnard Test Complete!');
    console.log('\n📋 Summary:');
    console.log('- If Tom Barnard is found, the gradual update will work');
    console.log('- If not found, we may need to adjust the scraper');
    console.log('- The gradual system will cycle through all players');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

// Run the test
testTomBarnard().catch(console.error);
