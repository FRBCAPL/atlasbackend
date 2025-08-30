import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import Ladder from './src/models/Ladder.js';
import LadderPlayer from './src/models/LadderPlayer.js';

async function checkLadderIds() {
  try {
    console.log('🔍 CHECKING LADDER IDs');
    console.log('======================\n');

    // Connect to MongoDB
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check existing ladders
    console.log('📊 Checking existing ladders...');
    const ladders = await Ladder.find({});
    
    if (ladders.length === 0) {
      console.log('❌ No ladders found in database');
    } else {
      console.log(`✅ Found ${ladders.length} ladders:`);
      ladders.forEach(ladder => {
        console.log(`   ${ladder._id} - ${ladder.name} (${ladder.ladderName})`);
      });
    }

    // Check existing ladder players to see what ladderId they use
    console.log('\n📊 Checking existing ladder players...');
    const existingPlayers = await LadderPlayer.find({}).limit(5);
    
    if (existingPlayers.length === 0) {
      console.log('❌ No ladder players found');
    } else {
      console.log(`✅ Found ${existingPlayers.length} sample players:`);
      existingPlayers.forEach(player => {
        console.log(`   ${player.firstName} ${player.lastName} - LadderId: ${player.ladderId}, LadderName: ${player.ladderName}`);
      });
    }

    console.log('\n✅ Check complete!');
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkLadderIds();
