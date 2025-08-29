import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';

dotenv.config();

const checkCurrentLadder = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const players = await LadderPlayer.find({}).sort({position: 1});
    
    console.log('\n📋 CURRENT LADDER PLAYERS:');
    console.log('==========================');
    
    if (players.length === 0) {
      console.log('❌ No ladder players found in database');
      return;
    }

    players.forEach((player, index) => {
      const wins = player.stats?.wins || 0;
      const losses = player.stats?.losses || 0;
      console.log(`${index + 1}. ${player.firstName} ${player.lastName} - ${player.fargoRate} (${wins}W/${losses}L) - ${player.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });

    console.log(`\n📊 Total players: ${players.length}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkCurrentLadder();
