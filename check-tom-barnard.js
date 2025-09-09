#!/usr/bin/env node

/**
 * Simple check to see if Tom Barnard is in our database
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fargoUpdateService from './src/services/fargoUpdateService.js';

dotenv.config();

async function checkTomBarnard() {
  try {
    console.log('🔍 Checking for Tom Barnard in Database');
    console.log('======================================\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all players from 499-under ladder
    console.log('📊 Getting all players from 499-under ladder...');
    const players = await fargoUpdateService.getCurrentRatings('499-under');
    console.log(`✅ Found ${players.length} players in database\n`);

    // Search for Tom Barnard
    console.log('🔍 Searching for Tom Barnard...');
    const tomPlayer = players.find(p => 
      p.name.toLowerCase().includes('tom') && 
      p.name.toLowerCase().includes('barnard')
    );
    
    if (tomPlayer) {
      console.log(`✅ Found Tom Barnard!`);
      console.log(`   Name: ${tomPlayer.name}`);
      console.log(`   Current Rating: ${tomPlayer.fargoRate || 'No Rating'}`);
      console.log(`   Position: ${tomPlayer.position}`);
      console.log(`   Index: ${players.indexOf(tomPlayer)}`);
    } else {
      console.log(`❌ Tom Barnard not found in database`);
      
      // Show players with "tom" in the name
      const tomPlayers = players.filter(p => p.name.toLowerCase().includes('tom'));
      if (tomPlayers.length > 0) {
        console.log(`\n🔍 Players with "Tom" in name:`);
        tomPlayers.forEach(p => {
          console.log(`   - ${p.name} (Rating: ${p.fargoRate || 'No Rating'})`);
        });
      }
      
      // Show players with "barnard" in the name
      const barnardPlayers = players.filter(p => p.name.toLowerCase().includes('barnard'));
      if (barnardPlayers.length > 0) {
        console.log(`\n🔍 Players with "Barnard" in name:`);
        barnardPlayers.forEach(p => {
          console.log(`   - ${p.name} (Rating: ${p.fargoRate || 'No Rating'})`);
        });
      }
    }

    // Show first 10 players as examples
    console.log(`\n📋 First 10 players in database:`);
    players.slice(0, 10).forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name} (Rating: ${p.fargoRate || 'No Rating'})`);
    });

    if (players.length > 10) {
      console.log(`   ... and ${players.length - 10} more players`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

// Run the check
checkTomBarnard().catch(console.error);



