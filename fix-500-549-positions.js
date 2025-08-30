import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import LadderPlayer from './src/models/LadderPlayer.js';

async function fix500to549Positions() {
  try {
    console.log('🔧 FIXING 500-549 LADDER POSITIONS');
    console.log('===================================\n');

    // Connect to MongoDB
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all players in 500-549 ladder, sorted by current position
    console.log('📊 Getting current 500-549 ladder players...');
    const players500to549 = await LadderPlayer.find({ ladderName: '500-549' }).sort({ position: 1 });
    
    console.log(`Found ${players500to549.length} players in 500-549 ladder`);
    
    // Show current positions
    console.log('\n📊 Current positions:');
    players500to549.forEach(player => {
      console.log(`   Position ${player.position}: ${player.firstName} ${player.lastName} (${player.fargoRate})`);
    });

    // Renumber positions starting from 1
    console.log('\n📊 Renumbering positions to start at 1...');
    for (let i = 0; i < players500to549.length; i++) {
      const player = players500to549[i];
      const newPosition = i + 1;
      
      console.log(`   Position ${player.position} → ${newPosition}: ${player.firstName} ${player.lastName}`);
      
      player.position = newPosition;
      await player.save();
    }

    // Verification
    console.log('\n🔍 VERIFICATION:');
    console.log('================');
    
    const final500to549 = await LadderPlayer.find({ ladderName: '500-549' }).sort({ position: 1 });
    
    console.log(`\n📊 500-549 Ladder: ${final500to549.length} players`);
    final500to549.forEach(player => {
      console.log(`   ${player.position}. ${player.firstName} ${player.lastName} (${player.fargoRate})`);
    });

    console.log('\n✅ 500-549 ladder positions fixed successfully!');
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error fixing 500-549 positions:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fix500to549Positions();
