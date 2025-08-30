import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import LadderPlayer from './src/models/LadderPlayer.js';

async function checkLadderAssignments() {
  try {
    console.log('🔍 CHECKING LADDER ASSIGNMENTS');
    console.log('==============================\n');

    // Connect to MongoDB
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check 500-549 ladder for players who should be in 550+
    console.log('📊 Checking 500-549 ladder for misplaced players...');
    const players500to549 = await LadderPlayer.find({ ladderName: '500-549' }).sort({ position: 1 });
    
    const misplacedPlayers = [];
    
    for (const player of players500to549) {
      if (player.fargoRate >= 550) {
        misplacedPlayers.push({
          player,
          shouldBeIn: '550-plus',
          reason: `Fargo rate ${player.fargoRate} >= 550`
        });
      }
    }
    
    if (misplacedPlayers.length > 0) {
      console.log(`❌ Found ${misplacedPlayers.length} players in 500-549 who should be in 550+:`);
      misplacedPlayers.forEach(({ player, reason }) => {
        console.log(`   - ${player.firstName} ${player.lastName} (${player.fargoRate}) - ${reason}`);
      });
    } else {
      console.log('✅ All players in 500-549 ladder are correctly placed');
    }

    // Check 550+ ladder for players who should be in 500-549
    console.log('\n📊 Checking 550+ ladder for misplaced players...');
    const players550plus = await LadderPlayer.find({ ladderName: '550-plus' }).sort({ position: 1 });
    
    const misplacedIn550 = [];
    
    for (const player of players550plus) {
      if (player.fargoRate < 550) {
        misplacedIn550.push({
          player,
          shouldBeIn: '500-549',
          reason: `Fargo rate ${player.fargoRate} < 550`
        });
      }
    }
    
    if (misplacedIn550.length > 0) {
      console.log(`❌ Found ${misplacedIn550.length} players in 550+ who should be in 500-549:`);
      misplacedIn550.forEach(({ player, reason }) => {
        console.log(`   - ${player.firstName} ${player.lastName} (${player.fargoRate}) - ${reason}`);
      });
    } else {
      console.log('✅ All players in 550+ ladder are correctly placed');
    }

    console.log('\n📊 SUMMARY:');
    console.log('============');
    console.log(`Total players to move: ${misplacedPlayers.length + misplacedIn550.length}`);
    
    if (misplacedPlayers.length > 0 || misplacedIn550.length > 0) {
      console.log('\n🔧 Players need to be moved to correct ladders!');
    } else {
      console.log('\n✅ All players are in the correct ladders!');
    }

  } catch (error) {
    console.error('❌ Error checking ladder assignments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkLadderAssignments();
