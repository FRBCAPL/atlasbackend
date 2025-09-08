#!/usr/bin/env node

/**
 * Check all players in the database
 */

import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';

async function checkAllPlayers() {
  try {
    console.log('🔍 Checking All Players');
    console.log('======================\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/frontrangepoolhub');
    console.log('✅ Connected to MongoDB');

    // Get total count of players
    const totalPlayers = await LadderPlayer.countDocuments();
    console.log(`📊 Total players in database: ${totalPlayers}`);

    if (totalPlayers > 0) {
      // Get first 10 players
      console.log('\n📋 First 10 players:');
      const players = await LadderPlayer.find().limit(10);
      
      players.forEach((player, index) => {
        console.log(`   ${index + 1}. ${player.firstName} ${player.lastName} (Ladder: ${player.ladderName}, Rating: ${player.fargoRate})`);
      });
    } else {
      console.log('❌ No players found in database');
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
checkAllPlayers().catch(console.error);

