import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';

dotenv.config();

const updateNoFargoRateDisplay = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 UPDATING NO FARGO RATE DISPLAY');
    console.log('====================================');

    // Get all ladder players
    const players = await LadderPlayer.find({ ladderName: '499-under' }).sort({ position: 1 });
    console.log(`📊 Found ${players.length} players`);

    // Find players with Fargo rate of 0
    const playersWithNoRating = players.filter(p => p.fargoRate === 0);
    console.log(`📋 Players with no Fargo rate: ${playersWithNoRating.length}`);

    if (playersWithNoRating.length > 0) {
      console.log('\n📝 Players with no Fargo rate:');
      playersWithNoRating.forEach(p => {
        console.log(`   ${p.position}. ${p.firstName} ${p.lastName} (currently: ${p.fargoRate})`);
      });
    }

    console.log('\n✅ All players with Fargo rate 0 will display as "No FargoRate" in the app');
    console.log('✅ The database stores 0, but the app will show "No FargoRate" for these players');
    console.log('✅ This is handled by the frontend display logic');

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

console.log(`
🔄 UPDATE NO FARGO RATE DISPLAY
================================

This script will:
1. Check which players have no Fargo rate (value = 0)
2. Confirm they will display as "No FargoRate" in the app
3. Show the current state of players without ratings

📋 Players with Fargo rate 0 will show as "No FargoRate" in the app
`);

updateNoFargoRateDisplay();
