#!/usr/bin/env node

/**
 * Check what ladders and players exist in the database
 */

import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';

async function checkLadderPlayers() {
  try {
    console.log('🔍 Checking Ladder Players');
    console.log('==========================\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/frontrangepoolhub');
    console.log('✅ Connected to MongoDB');

    // Get all unique ladder names
    console.log('📋 Getting all ladder names...');
    const ladderNames = await LadderPlayer.distinct('ladderName');
    console.log(`Found ladders: ${ladderNames.join(', ')}`);

    // Get players from each ladder
    for (const ladderName of ladderNames) {
      console.log(`\n📊 Players in ${ladderName} ladder:`);
      const players = await LadderPlayer.find({ ladderName }).limit(5);
      
      if (players.length === 0) {
        console.log('   No players found');
      } else {
        players.forEach((player, index) => {
          console.log(`   ${index + 1}. ${player.firstName} ${player.lastName} (Rating: ${player.fargoRate})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the check
checkLadderPlayers().catch(console.error);