import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';

dotenv.config();

// Fargo rates in exact order (1-50) as provided by user
const fargoRates = [
  471, 463, 455, 470, 488, 472, 373, 443, 319, 365,
  null, 427, 467, 464, 352, 421, 460, 482, 458, 333,
  421, 455, null, 354, 395, 393, 396, 453, 400, 403,
  340, 475, 443, 452, 440, 400, 432, 255, 386, 485,
  294, null, 435, null, 486, 476, null, 314, 391, 491
];

const updateFargoRates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 UPDATING FARGO RATES');
    console.log('========================');

    // Get all ladder players in order
    const players = await LadderPlayer.find({ ladderName: '499-under' }).sort({ position: 1 });
    console.log(`📊 Found ${players.length} players`);

    if (players.length !== 50) {
      console.log('❌ Expected 50 players, found', players.length);
      return;
    }

    // Update Fargo rates for each player
    console.log('\n📝 Updating Fargo rates...');
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const newFargoRate = fargoRates[i];
      const oldFargoRate = player.fargoRate;
      
      player.fargoRate = newFargoRate;
      await player.save();
      
      const rateDisplay = newFargoRate ? newFargoRate : 'No Rating';
      const changeDisplay = oldFargoRate !== newFargoRate ? ` (${oldFargoRate} → ${rateDisplay})` : '';
      
      console.log(`✅ ${player.position}. ${player.firstName} ${player.lastName}: ${rateDisplay}${changeDisplay}`);
    }

    // Verify final state
    const finalPlayers = await LadderPlayer.find({ ladderName: '499-under' }).sort({ position: 1 });
    const playersWithRating = finalPlayers.filter(p => p.fargoRate);
    const playersWithoutRating = finalPlayers.filter(p => !p.fargoRate);
    
    console.log(`\n🎉 Fargo rates updated!`);
    console.log(`✅ Total players: ${finalPlayers.length}`);
    console.log(`✅ Players with rating: ${playersWithRating.length}`);
    console.log(`✅ Players without rating: ${playersWithoutRating.length}`);
    console.log(`✅ All 50 players updated in exact order`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

console.log(`
🔄 UPDATE FARGO RATES
=====================

This script will:
1. Update all 50 players with new Fargo rates
2. Use exact order provided by user
3. Handle "No Rating" entries (set to null)
4. Show before/after changes

📋 Total players to update: ${fargoRates.length}
📋 Players with rating: ${fargoRates.filter(rate => rate !== null).length}
📋 Players without rating: ${fargoRates.filter(rate => rate === null).length}
`);

updateFargoRates();
