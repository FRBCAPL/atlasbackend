import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';

dotenv.config();

const renumberLadderPositions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const ladderNames = ['499-under', '500-549', '550-plus'];
    
    for (const ladderName of ladderNames) {
      console.log(`\n🔄 Renumbering ${ladderName} ladder...`);
      
      // Get all players in this ladder, sorted by current position
      const players = await LadderPlayer.find({ 
        ladderName: ladderName 
      }).sort({ position: 1 });
      
      console.log(`Found ${players.length} players in ${ladderName}`);
      
      if (players.length === 0) {
        console.log(`No players found in ${ladderName}, skipping...`);
        continue;
      }
      
      // Renumber positions starting from 1
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const oldPosition = player.position;
        const newPosition = i + 1;
        
        if (oldPosition !== newPosition) {
          player.position = newPosition;
          await player.save();
          console.log(`  ${oldPosition} → ${newPosition}: ${player.firstName} ${player.lastName} (${player.fargoRate})`);
        } else {
          console.log(`  ${oldPosition}: ${player.firstName} ${player.lastName} (${player.fargoRate}) - no change`);
        }
      }
      
      console.log(`✅ ${ladderName} ladder renumbered successfully`);
    }

    console.log('\n🎉 All ladder positions renumbered successfully!');
    
    // Show summary
    console.log('\n📊 Final Summary:');
    for (const ladderName of ladderNames) {
      const players = await LadderPlayer.find({ ladderName }).sort({ position: 1 });
      console.log(`\n${ladderName.toUpperCase()}: ${players.length} players`);
      if (players.length > 0) {
        console.log('Top 5:');
        players.slice(0, 5).forEach(player => {
          console.log(`  #${player.position}: ${player.firstName} ${player.lastName} (${player.fargoRate})`);
        });
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ MongoDB disconnected');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

renumberLadderPositions();
