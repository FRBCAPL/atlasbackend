// Script to directly create 5 test players for the 499-under ladder
// This bypasses the API and directly creates players in the database

import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';
import Ladder from './src/models/Ladder.js';
import dotenv from 'dotenv';

dotenv.config();

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const testPlayers = [
  {
    firstName: 'Test',
    lastName: 'Player1',
    email: 'testplayer1@test.com',
    fargoRate: 300,
    ladderName: '499-under',
    position: 51, // Bottom of ladder
    isActive: true,
    wins: 0,
    losses: 0,
    stats: { wins: 0, losses: 0 }
  },
  {
    firstName: 'Test',
    lastName: 'Player2',
    email: 'testplayer2@test.com',
    fargoRate: 295,
    ladderName: '499-under',
    position: 52,
    isActive: true,
    wins: 0,
    losses: 0,
    stats: { wins: 0, losses: 0 }
  },
  {
    firstName: 'Test',
    lastName: 'Player3',
    email: 'testplayer3@test.com',
    fargoRate: 290,
    ladderName: '499-under',
    position: 53,
    isActive: true,
    wins: 0,
    losses: 0,
    stats: { wins: 0, losses: 0 }
  },
  {
    firstName: 'Test',
    lastName: 'Player4',
    email: 'testplayer4@test.com',
    fargoRate: 285,
    ladderName: '499-under',
    position: 54,
    isActive: true,
    wins: 0,
    losses: 0,
    stats: { wins: 0, losses: 0 }
  },
  {
    firstName: 'Test',
    lastName: 'Player5',
    email: 'testplayer5@test.com',
    fargoRate: 280,
    ladderName: '499-under',
    position: 55,
    isActive: true,
    wins: 0,
    losses: 0,
    stats: { wins: 0, losses: 0 }
  }
];

async function createTestPlayers() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find the 499-under ladder
    const ladder = await Ladder.findOne({ name: '499-under' });
    if (!ladder) {
      console.log('❌ 499-under ladder not found!');
      return;
    }
    console.log(`✅ Found ladder: ${ladder.name} (ID: ${ladder._id})\n`);

    console.log('🧪 Creating test players for 499-under ladder...\n');
    
    for (let i = 0; i < testPlayers.length; i++) {
      const playerData = testPlayers[i];
      
      try {
        console.log(`Creating ${playerData.firstName} ${playerData.lastName} (Position #${playerData.position})...`);
        
        // Check if player already exists
        const existingPlayer = await LadderPlayer.findOne({
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          ladderName: playerData.ladderName
        });

        if (existingPlayer) {
          console.log(`   ⚠️  Player already exists: ${playerData.firstName} ${playerData.lastName}`);
          continue;
        }

        // Create new player
        const newPlayer = new LadderPlayer({
          ...playerData,
          ladderId: ladder._id,
          wins: 0,
          losses: 0,
          totalMatches: 0,
          immunityUntil: null,
          isSuspended: false,
          vacationMode: false,
          vacationUntil: null,
          pendingChallenges: [],
          scheduledMatches: []
        });

        await newPlayer.save();
        console.log(`   ✅ Successfully created ${playerData.firstName} ${playerData.lastName}`);
        console.log(`      Email: ${playerData.email}`);
        console.log(`      FargoRate: ${playerData.fargoRate}`);
        console.log(`      Position: #${playerData.position}\n`);
      } catch (error) {
        console.log(`   ❌ Error creating ${playerData.firstName} ${playerData.lastName}: ${error.message}\n`);
      }
    }
    
    console.log('🎉 Test player creation complete!');
    console.log('\n📋 Test Players Created:');
    console.log('1. Test Player1 - testplayer1@test.com (Position #51)');
    console.log('2. Test Player2 - testplayer2@test.com (Position #52)');
    console.log('3. Test Player3 - testplayer3@test.com (Position #53)');
    console.log('4. Test Player4 - testplayer4@test.com (Position #54)');
    console.log('5. Test Player5 - testplayer5@test.com (Position #55)');
    console.log('\n💡 You can now use these test players to safely test:');
    console.log('- Sending challenges between test players');
    console.log('- Testing status changes (Proposal, Scheduled, etc.)');
    console.log('- Testing the enhanced status system');
    console.log('\n⚠️  Remember: These are test players - don\'t use them for real matches!');
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the script
createTestPlayers().catch(console.error);
