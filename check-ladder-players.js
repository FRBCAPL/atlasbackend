import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';

const MONGODB_URI = 'mongodb://localhost:27017/singleLeague';

const checkLadderPlayers = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const players = await LadderPlayer.find({}).limit(10);
    console.log(`\n📋 Found ${players.length} ladder players (showing first 10):`);
    
    players.forEach((player, index) => {
      console.log(`\n${index + 1}. ${player.firstName} ${player.lastName}`);
      console.log(`   Email: ${player.email || 'No email'}`);
      console.log(`   PIN: ${player.pin ? 'Has PIN' : 'No PIN'}`);
      console.log(`   Ladder: ${player.ladderName}`);
      console.log(`   Position: ${player.position}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkLadderPlayers();
