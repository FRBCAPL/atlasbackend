import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import LadderPlayer from './src/models/LadderPlayer.js';

async function fixLadderAssignments() {
  try {
    console.log('🔧 FIXING LADDER ASSIGNMENTS');
    console.log('============================\n');

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
          
          // Reset position (will be recalculated)
          player.position = 0;
          
          await player.save();
          console.log(`   ✅ Moved ${player.firstName} ${player.lastName} to 550+ ladder`);
        } else {
          console.log(`   ❌ Could not find ${playerData.firstName} ${playerData.lastName} in 500-549 ladder`);
        }
      } catch (error) {
        console.log(`   ❌ Error moving ${playerData.firstName} ${playerData.lastName}: ${error.message}`);
      }
    }

    // Recalculate positions for both ladders
    console.log('\n📊 Recalculating positions...');
    
    // 500-549 ladder
    const players500to549 = await LadderPlayer.find({ ladderName: '500-549' }).sort({ fargoRate: -1 });
    for (let i = 0; i < players500to549.length; i++) {
      players500to549[i].position = i + 1;
      await players500to549[i].save();
    }
    console.log(`   ✅ Updated positions for ${players500to549.length} players in 500-549 ladder`);

    // 550+ ladder
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

    console.log('\n✅ Ladder assignments fixed successfully!');
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error fixing ladder assignments:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixLadderAssignments();
