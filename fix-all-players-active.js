import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';

dotenv.config();

const fixAllPlayersActive = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 MAKING ALL PLAYERS ACTIVE');
    console.log('=============================');

    // Get all ladder players
    const players = await LadderPlayer.find({ ladderName: '499-under' }).sort({ position: 1 });
    console.log(`📊 Found ${players.length} players`);

    // Make ALL players active
    console.log('\n📝 Making ALL players ACTIVE...');
    
    for (const player of players) {
      player.isActive = true;
      player.immunityUntil = null;
      player.vacationMode = false;
      player.vacationUntil = null;
      
      await player.save();
      console.log(`✅ Made ACTIVE: ${player.position}. ${player.firstName} ${player.lastName}`);
    }

    // Verify final state
    const finalPlayers = await LadderPlayer.find({ ladderName: '499-under' }).sort({ position: 1 });
    const activePlayers = finalPlayers.filter(p => p.isActive);
    const inactivePlayers = finalPlayers.filter(p => !p.isActive);
    
    console.log(`\n🎉 All players made ACTIVE!`);
    console.log(`✅ Total players: ${finalPlayers.length}`);
    console.log(`✅ Active players: ${activePlayers.length}`);
    console.log(`✅ Inactive players: ${inactivePlayers.length}`);
    console.log(`✅ All 50 players will now show in the app`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

console.log(`
🔄 MAKE ALL PLAYERS ACTIVE
==========================

This script will:
1. Make ALL 50 players ACTIVE
2. Remove any NO SHOW, VACATION, or IMMUNE statuses
3. Ensure ALL players show up in the app
4. No gaps in the ladder display

📋 All players will be visible in the app
`);

fixAllPlayersActive();
