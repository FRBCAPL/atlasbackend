import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// LadderPlayer Schema
const ladderPlayerSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  fargoRate: { type: Number, required: true },
  position: Number,
  ladderName: String,
  isActive: { type: Boolean, default: true },
  immunityUntil: Date,
  vacationMode: { type: Boolean, default: false },
  vacationUntil: Date,
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 }
  }
});

const LadderPlayer = mongoose.model('LadderPlayer', ladderPlayerSchema);

// Wins data in order (1-50)
const wins = [
  15, 8, 3, 7, 7, 1, 3, 6, 1, 2,
  5, 2, 1, 1, 0, 3, 1, 2, 1, 0,
  1, 0, 0, 0, 2, 0, 0, 1, 0, 3,
  0, 1, 0, 0, 1, 2, 0, 1, 2, 1,
  0, 0, 0, 1, 0, 0, 2, 0, 0, 0
];

// Losses data in order (1-50)
const losses = [
  2, 6, 4, 8, 2, 4, 3, 3, 1, 2,
  1, 3, 2, 2, 4, 1, 2, 1, 0, 3,
  4, 1, 2, 1, 2, 3, 0, 0, 0, 2,
  1, 2, 0, 0, 1, 0, 1, 2, 1, 0,
  0, 0, 1, 3, 0, 0, 0, 2, 2, 0
];

const updateWinsLosses = async () => {
  console.log('\n🔄 UPDATE WINS & LOSSES\n========================\n');
  console.log('This script will:');
  console.log('1. Update all 50 players with new wins/losses');
  console.log('2. Use exact order provided by user');
  console.log('3. Show before/after changes\n');
  
  console.log(`📋 Total players to update: 50`);
  console.log(`📊 Total wins across all players: ${wins.reduce((a, b) => a + b, 0)}`);
  console.log(`📊 Total losses across all players: ${losses.reduce((a, b) => a + b, 0)}\n`);

  try {
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all players from 499-under ladder, sorted by position
    const players = await LadderPlayer.find({ ladderName: '499-under' })
      .sort({ position: 1 });

    console.log(`📊 Found ${players.length} players\n`);

    if (players.length !== 50) {
      console.error(`❌ Expected 50 players, found ${players.length}`);
      return;
    }

    console.log('📝 Updating wins and losses...\n');

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const newWins = wins[i];
      const newLosses = losses[i];
      
      const oldWins = player.wins || 0;
      const oldLosses = player.losses || 0;

      // Update both wins/losses and stats object
      player.wins = newWins;
      player.losses = newLosses;
      player.stats = {
        wins: newWins,
        losses: newLosses
      };

      await player.save();

      const winsChange = newWins !== oldWins ? ` (${oldWins} → ${newWins})` : '';
      const lossesChange = newLosses !== oldLosses ? ` (${oldLosses} → ${newLosses})` : '';
      
      console.log(`✅ ${player.position}. ${player.firstName} ${player.lastName}: ${newWins}W${winsChange} ${newLosses}L${lossesChange}`);
    }

    console.log('\n🎉 Wins and losses update finished!');
    console.log(`✅ Total players: ${players.length}`);
    console.log(`✅ All players updated with new win/loss records`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

updateWinsLosses();
