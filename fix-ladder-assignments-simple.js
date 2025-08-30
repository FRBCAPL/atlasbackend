import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import LadderPlayer from './src/models/LadderPlayer.js';

async function fixLadderAssignmentsSimple() {
  try {
    console.log('🔧 FIXING LADDER ASSIGNMENTS (SIMPLE)');
    console.log('=====================================\n');

    // Connect to MongoDB
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Ladder IDs
    const LADDER_IDS = {
      '500-549': '68ad3d317367a8f33a23f4f7',
      '550-plus': '68ad3d317367a8f33a23f4f8'
    };

    // Players to move from 500-549 to 550+
    const playersToMove = [
      { firstName: 'Jahnzel', lastName: 'Rionn', fargoRate: 558 },
      { firstName: 'John', lastName: 'Burgess', fargoRate: 582 },
      { firstName: 'Noel', lastName: 'Montano Martinez', fargoRate: 572 },
      { firstName: 'Randy', lastName: 'Ramirez', fargoRate: 576 },
      { firstName: 'Anthony', lastName: 'Zapf', fargoRate: 581 }
    ];

    console.log('📊 Moving players from 500-549 to 550+ ladder...');
    
    for (const playerData of playersToMove) {
      try {
        // Find the player in 500-549 ladder
        const player = await LadderPlayer.findOne({
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          ladderName: '500-549'
        });

        if (player) {
          console.log(`   🔄 Moving ${player.firstName} ${player.lastName} (${player.fargoRate})...`);
          
          // Update player to 550+ ladder
          player.ladderName = '550-plus';
          player.ladderId = LADDER_IDS['550-plus'];
          
          // Keep the same position for now (will be adjusted later)
          await player.save();
          console.log(`   ✅ Moved ${player.firstName} ${player.lastName} to 550+ ladder`);
        } else {
          console.log(`   ❌ Could not find ${playerData.firstName} ${playerData.lastName} in 500-549 ladder`);
        }
      } catch (error) {
        console.log(`   ❌ Error moving ${playerData.firstName} ${playerData.lastName}: ${error.message}`);
      }
    }

    // Only recalculate positions for 550+ ladder (don't touch 500-549)
    console.log('\n📊 Recalculating positions for 550+ ladder only...');
    
    const players550plus = await LadderPlayer.find({ ladderName: '550-plus' }).sort({ fargoRate: -1 });
    for (let i = 0; i < players550plus.length; i++) {
      players550plus[i].position = i + 1;
      await players550plus[i].save();
    }
    console.log(`   ✅ Updated positions for ${players550plus.length} players in 550+ ladder`);

    // Verification
    console.log('\n🔍 VERIFICATION:');
    console.log('================');
    
    const final500to549 = await LadderPlayer.find({ ladderName: '500-549' }).sort({ position: 1 });
    const final550plus = await LadderPlayer.find({ ladderName: '550-plus' }).sort({ position: 1 });
    
    console.log(`\n📊 500-549 Ladder: ${final500to549.length} players`);
    final500to549.forEach(player => {
      console.log(`   ${player.position}. ${player.firstName} ${player.lastName} (${player.fargoRate})`);
    });
    
    console.log(`\n📊 550+ Ladder: ${final550plus.length} players`);
    final550plus.forEach(player => {
      console.log(`   ${player.position}. ${player.firstName} ${player.lastName} (${player.fargoRate})`);
    });

    // Check for any remaining players with Fargo >= 550 in 500-549 ladder
    const remainingHighPlayers = final500to549.filter(player => player.fargoRate >= 550);
    if (remainingHighPlayers.length > 0) {
      console.log(`\n⚠️  WARNING: ${remainingHighPlayers.length} players with Fargo >= 550 still in 500-549 ladder:`);
      remainingHighPlayers.forEach(player => {
        console.log(`   - ${player.firstName} ${player.lastName} (${player.fargoRate})`);
      });
    } else {
      console.log('\n✅ All players with Fargo >= 550 have been moved to 550+ ladder!');
    }

    console.log('\n✅ Ladder assignments fixed successfully!');
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error fixing ladder assignments:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixLadderAssignmentsSimple();
