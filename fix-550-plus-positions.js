import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import LadderPlayer from './src/models/LadderPlayer.js';

async function fix550PlusPositions() {
  try {
    console.log('🔧 FIXING 550+ LADDER POSITIONS');
    console.log('================================\n');

    // Connect to MongoDB
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Correct order as specified by user
    const correctOrder = [
      { firstName: 'Lucas', lastName: 'Taylor', position: 1, fargoRate: 639 },
      { firstName: 'Ruben', lastName: 'Silva', position: 2, fargoRate: 712 },
      { firstName: 'Jahnzel', lastName: 'Rionn', position: 3, fargoRate: 558 },
      { firstName: 'John', lastName: 'Burgess', position: 4, fargoRate: 582 },
      { firstName: 'Noel', lastName: 'Montano Martinez', position: 5, fargoRate: 572 },
      { firstName: 'Randy', lastName: 'Ramirez', position: 6, fargoRate: 576 },
      { firstName: 'Anthony', lastName: 'Zapf', position: 7, fargoRate: 581 }
    ];

    console.log('📊 Updating 550+ ladder positions...');
    
    for (const playerData of correctOrder) {
      try {
        // Find the player in 550+ ladder
        const player = await LadderPlayer.findOne({
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          ladderName: '550-plus'
        });

        if (player) {
          console.log(`   Position ${playerData.position}: ${player.firstName} ${player.lastName} (${player.fargoRate})`);
          
          // Update position
          player.position = playerData.position;
          await player.save();
        } else {
          console.log(`   ❌ Could not find ${playerData.firstName} ${playerData.lastName} in 550+ ladder`);
        }
      } catch (error) {
        console.log(`   ❌ Error updating ${playerData.firstName} ${playerData.lastName}: ${error.message}`);
      }
    }

    // Verification
    console.log('\n🔍 VERIFICATION:');
    console.log('================');
    
    const final550plus = await LadderPlayer.find({ ladderName: '550-plus' }).sort({ position: 1 });
    
    console.log(`\n📊 550+ Ladder: ${final550plus.length} players`);
    final550plus.forEach(player => {
      console.log(`   ${player.position}. ${player.firstName} ${player.lastName} (${player.fargoRate})`);
    });

    console.log('\n✅ 550+ ladder positions fixed successfully!');
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error fixing 550+ positions:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fix550PlusPositions();
