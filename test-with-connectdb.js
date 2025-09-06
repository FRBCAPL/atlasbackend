#!/usr/bin/env node

/**
 * Test with the same database connection as the server
 */

import connectDB from './database.js';
import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';

async function testWithConnectDB() {
  try {
    console.log('🔍 Test with ConnectDB');
    console.log('=====================\n');

    // Use the same connection method as the server
    console.log('🔌 Connecting to MongoDB using connectDB...');
    await connectDB();
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

      // Get ladder names
      const ladderNames = await LadderPlayer.distinct('ladderName');
      console.log(`\n📋 Ladder names: ${ladderNames.join(', ')}`);
    } else {
      console.log('❌ No players found in database');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
testWithConnectDB().catch(console.error);
