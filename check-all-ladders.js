import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import LadderPlayer from './src/models/LadderPlayer.js';

async function checkAllLadders() {
  try {
    console.log('🔍 CHECKING ALL LADDERS');
    console.log('======================\n');

    // Connect to MongoDB
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check each ladder
    const ladders = ['499-under', '500-549', '550-plus'];
    
    for (const ladderName of ladders) {
      console.log(`📊 Checking ${ladderName} ladder:`);
      
      const players = await LadderPlayer.find({ ladderName: ladderName }).sort({ position: 1 });
      
      if (players.length === 0) {
        console.log(`   ❌ No players found in ${ladderName}`);
      } else {
        console.log(`   ✅ Found ${players.length} players in ${ladderName}:`);
        players.forEach(player => {
          console.log(`      ${player.position}. ${player.firstName} ${player.lastName} (${player.fargoRate})`);
        });
      }
      console.log('');
    }

    // Also check for any players without a ladder name
    const playersWithoutLadder = await LadderPlayer.find({ ladderName: { $exists: false } });
    if (playersWithoutLadder.length > 0) {
      console.log(`⚠️  Found ${playersWithoutLadder.length} players without ladder name:`);
      playersWithoutLadder.forEach(player => {
        console.log(`   ${player.firstName} ${player.lastName} (${player.fargoRate})`);
      });
    }

    console.log('✅ Check complete!');
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllLadders();
