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

// Status data in order (1-50)
const statuses = [
  'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'VACATION', 'ACTIVE',
  'ACTIVE', 'ACTIVE', 'ACTIVE', 'IMMUNE', 'ACTIVE', 'VACATION', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',
  'ACTIVE', 'NO SHOW/ANSWER', 'NO SHOW/ANSWER', 'NO SHOW/ANSWER', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',
  'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',
  'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'IMMUNE', 'ACTIVE', 'ACTIVE', 'ACTIVE'
];

const updatePlayerStatuses = async () => {
  console.log('\n🔄 UPDATE PLAYER STATUSES\n==========================\n');
  console.log('This script will:');
  console.log('1. Update all 50 players with new statuses');
  console.log('2. Use exact order provided by user');
  console.log('3. Show before/after changes\n');
  
  console.log(`📋 Total players to update: 50`);
  console.log(`📊 Status breakdown:`);
  const statusCounts = statuses.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} players`);
  });
  console.log('');

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

    console.log('📝 Updating player statuses...\n');

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const newStatus = statuses[i];
      
      // Get current status for comparison
      let currentStatus = 'ACTIVE';
      if (!player.isActive) {
        currentStatus = 'INACTIVE';
      } else if (player.immunityUntil && new Date(player.immunityUntil) > new Date()) {
        currentStatus = 'IMMUNE';
      } else if (player.vacationMode || (player.vacationUntil && new Date(player.vacationUntil) > new Date())) {
        currentStatus = 'VACATION';
      }

             // Update player based on new status - all players stay visible, status affects challenge availability
       switch (newStatus) {
         case 'ACTIVE':
           player.isActive = true; // Can be challenged
           player.immunityUntil = null;
           player.vacationMode = false;
           player.vacationUntil = null;
           break;
         case 'IMMUNE':
           player.isActive = true; // Visible but immune from challenges
           player.immunityUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
           player.vacationMode = false;
           player.vacationUntil = null;
           break;
         case 'VACATION':
           player.isActive = true; // Visible but on vacation (can't be challenged)
           player.immunityUntil = null;
           player.vacationMode = true;
           player.vacationUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
           break;
         case 'NO SHOW/ANSWER':
           player.isActive = true; // Keep visible, but will show as "Inactive" in status column
           player.immunityUntil = null;
           player.vacationMode = false;
           player.vacationUntil = null;
           // Add a custom field to track no-show status for display purposes
           player.noShowStatus = true;
           break;
       }

      await player.save();

      const statusChange = newStatus !== currentStatus ? ` (${currentStatus} → ${newStatus})` : '';
      
      console.log(`✅ ${player.position}. ${player.firstName} ${player.lastName}: ${newStatus}${statusChange}`);
    }

    console.log('\n🎉 Player statuses update finished!');
    console.log(`✅ Total players: ${players.length}`);
    console.log(`✅ All players updated with new statuses`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

updatePlayerStatuses();
