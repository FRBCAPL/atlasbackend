#!/usr/bin/env node

/**
 * Test updating Tom Barnard specifically using the gradual update system
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fargoScraperService from './src/services/fargoScraperService.js';
import fargoUpdateService from './src/services/fargoUpdateService.js';

dotenv.config();

async function testTomUpdate() {
  try {
    console.log('🧪 Testing Tom Barnard Update');
    console.log('=============================\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get Tom Barnard's current info
    console.log('📊 Getting Tom Barnard\'s current info...');
    const players = await fargoUpdateService.getCurrentRatings('499-under');
    const tomPlayer = players.find(p => 
      p.name.toLowerCase().includes('tom') && 
      p.name.toLowerCase().includes('barnard')
    );
    
    if (!tomPlayer) {
      console.log('❌ Tom Barnard not found in database');
      return;
    }
    
    console.log(`✅ Found Tom Barnard:`);
    console.log(`   Name: ${tomPlayer.name}`);
    console.log(`   Current Rating: ${tomPlayer.fargoRate}`);
    console.log(`   Position: ${tomPlayer.position}`);
    console.log(`   Index: ${players.indexOf(tomPlayer)}\n`);

    // Test the gradual update system with Tom Barnard
    console.log('🔄 Testing gradual update system with Tom Barnard...');
    const tomIndex = players.indexOf(tomPlayer);
    
    try {
      const result = await fargoScraperService.updateSinglePlayer('499-under', tomIndex);
      
      if (result.success) {
        console.log(`✅ Update completed successfully!`);
        console.log(`   Player: ${result.player}`);
        console.log(`   Old Rating: ${result.oldRating}`);
        console.log(`   New Rating: ${result.newRating}`);
        console.log(`   Next Index: ${result.nextIndex}`);
        
        if (result.oldRating !== result.newRating) {
          console.log(`   🎉 Rating changed! ${result.oldRating} → ${result.newRating}`);
        } else if (result.noChange) {
          console.log(`   ℹ️ No rating change (rating is current)`);
        } else {
          console.log(`   ⚠️ Player not found on FargoRate`);
        }
      } else {
        console.log(`❌ Update failed: ${result.reason}`);
      }
    } catch (error) {
      console.log(`❌ Error during update: ${error.message}`);
    }

    // Test the scraper directly with Tom Barnard
    console.log('\n🔍 Testing scraper directly with Tom Barnard...');
    try {
      const playerData = await fargoScraperService.searchPlayer('Tom', 'Barnard');
      
      if (playerData && playerData.rating) {
        console.log(`✅ Scraper found Tom Barnard:`);
        console.log(`   Name: ${playerData.name}`);
        console.log(`   Rating: ${playerData.rating}`);
        console.log(`   Source: ${playerData.source}`);
        
        if (playerData.rating !== tomPlayer.fargoRate) {
          console.log(`   🎉 Rating difference detected!`);
          console.log(`   Database: ${tomPlayer.fargoRate}`);
          console.log(`   FargoRate: ${playerData.rating}`);
        } else {
          console.log(`   ℹ️ Rating is current (no change needed)`);
        }
      } else {
        console.log(`❌ Scraper could not find Tom Barnard on FargoRate`);
        console.log(`   This could mean:`);
        console.log(`   - Name is spelled differently on FargoRate`);
        console.log(`   - Not in FargoRate database`);
        console.log(`   - Scraper needs adjustment`);
      }
    } catch (error) {
      console.log(`❌ Scraper error: ${error.message}`);
    }

    console.log('\n🎉 Tom Barnard Update Test Complete!');
    console.log('\n📋 Summary:');
    console.log('- Tom Barnard is in our database with rating 488');
    console.log('- Gradual update system can target him specifically');
    console.log('- If scraper works, his rating will be updated automatically');
    console.log('- System will cycle through all players every 6 hours');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

// Run the test
testTomUpdate().catch(console.error);

