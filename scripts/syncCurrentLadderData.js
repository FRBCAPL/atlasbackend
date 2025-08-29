import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';
import Ladder from '../src/models/Ladder.js';

dotenv.config();

// Current ladder data from Google Sheet (499 LADDER)
const currentLadderData = [
  { rank: 1, name: 'Brett Gonzalez', fargoRate: 471, wins: 15, losses: 2, status: 'ACTIVE' },
  { rank: 2, name: 'Tito Rodriguez', fargoRate: 463, wins: 8, losses: 6, status: 'ACTIVE' },
  { rank: 3, name: 'Lawrence Anaya', fargoRate: 455, wins: 3, losses: 4, status: 'ACTIVE' },
  { rank: 4, name: 'Ramsey Knowles', fargoRate: 470, wins: 7, losses: 8, status: 'ACTIVE' },
  { rank: 5, name: 'Tom Barnard', fargoRate: 488, wins: 7, losses: 2, status: 'ACTIVE' },
  { rank: 6, name: 'Chris Roberts', fargoRate: 472, wins: 3, losses: 3, status: 'ACTIVE' },
  { rank: 7, name: 'David Delgado', fargoRate: 373, wins: 3, losses: 3, status: 'ACTIVE' },
  { rank: 8, name: 'Cody Kinney', fargoRate: 443, wins: 6, losses: 3, status: 'ACTIVE' },
  { rank: 9, name: 'Crystal Pettiford', fargoRate: 319, wins: 1, losses: 1, status: 'VACATION' },
  { rank: 10, name: 'Louis Martinez', fargoRate: 365, wins: 2, losses: 2, status: 'ACTIVE' },
  { rank: 11, name: 'Tony Neumann', fargoRate: 450, wins: 5, losses: 1, status: 'ACTIVE' }, // No Rating defaulted to 450
  { rank: 12, name: 'Christopher Anderson', fargoRate: 427, wins: 2, losses: 3, status: 'ACTIVE' },
  { rank: 13, name: 'Kent Montel', fargoRate: 467, wins: 1, losses: 2, status: 'ACTIVE' },
  { rank: 14, name: 'Ramon Valdez', fargoRate: 464, wins: 2, losses: 2, status: 'IMMUNE' },
  { rank: 15, name: 'Darren Maya', fargoRate: 352, wins: 4, losses: 1, status: 'VACATION' },
  { rank: 16, name: 'Lyndi Navarrete', fargoRate: 421, wins: 3, losses: 1, status: 'VACATION' },
  { rank: 17, name: 'Johnny Grimaldo', fargoRate: 460, wins: 1, losses: 2, status: 'ACTIVE' },
  { rank: 18, name: 'Joe Eusoof', fargoRate: 482, wins: 2, losses: 2, status: 'ACTIVE' },
  { rank: 19, name: 'Erlon Calderon', fargoRate: 458, wins: 1, losses: 1, status: 'ACTIVE' },
  { rank: 20, name: 'Ethienne Rodriguez', fargoRate: 333, wins: 3, losses: 1, status: 'ACTIVE' },
  { rank: 21, name: 'George S. Gutierrez', fargoRate: 421, wins: 1, losses: 4, status: 'ACTIVE' },
  { rank: 22, name: 'Ben Mullenaux', fargoRate: 455, wins: 1, losses: 2, status: 'NO SHOW/ANSW...' },
  { rank: 23, name: 'Zach Hamning', fargoRate: 450, wins: 2, losses: 2, status: 'NO SHOW/ANSW...' }, // No Rating defaulted to 450
  { rank: 24, name: 'Micheal Queen', fargoRate: 354, wins: 1, losses: 1, status: 'NO SHOW/ANSW...' },
  { rank: 25, name: 'Victor Burgos', fargoRate: 395, wins: 2, losses: 2, status: 'ACTIVE' },
  { rank: 26, name: 'Sam Merritt', fargoRate: 393, wins: 3, losses: 3, status: 'ACTIVE' },
  { rank: 27, name: 'Rob Weaver', fargoRate: 396, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 28, name: 'Jeremy Watt', fargoRate: 453, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 29, name: 'Rick Romero', fargoRate: 400, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 30, name: 'Kent Peterson', fargoRate: 403, wins: 3, losses: 2, status: 'ACTIVE' },
  { rank: 31, name: 'Christopher Sisneros', fargoRate: 340, wins: 1, losses: 1, status: 'ACTIVE' },
  { rank: 32, name: 'Gary Cogzell', fargoRate: 475, wins: 1, losses: 2, status: 'ACTIVE' },
  { rank: 33, name: 'John Witherbee', fargoRate: 443, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 34, name: 'Vince Arellano', fargoRate: 452, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 35, name: 'Dave Shelton', fargoRate: 440, wins: 1, losses: 1, status: 'ACTIVE' },
  { rank: 36, name: 'Jo Graclik', fargoRate: 400, wins: 2, losses: 1, status: 'ACTIVE' },
  { rank: 37, name: 'Valeria Mendoza Poncedeleon', fargoRate: 432, wins: 1, losses: 1, status: 'ACTIVE' },
  { rank: 38, name: 'Jordan Tiona', fargoRate: 255, wins: 1, losses: 2, status: 'ACTIVE' },
  { rank: 39, name: 'Mario Zimmerman', fargoRate: 386, wins: 2, losses: 1, status: 'ACTIVE' },
  { rank: 40, name: 'Lorenzo Avila', fargoRate: 485, wins: 1, losses: 1, status: 'ACTIVE' },
  { rank: 41, name: 'Melissa Swatek', fargoRate: 294, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 42, name: 'Raymond Carlson', fargoRate: 450, wins: 0, losses: 0, status: 'ACTIVE' }, // No Rating defaulted to 450
  { rank: 43, name: 'Christopher Edl', fargoRate: 435, wins: 1, losses: 1, status: 'ACTIVE' },
  { rank: 44, name: 'Jacob Poland', fargoRate: 450, wins: 1, losses: 3, status: 'ACTIVE' }, // No Rating defaulted to 450
  { rank: 45, name: 'James Duckworth', fargoRate: 486, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 46, name: 'Kevin Santiesteban', fargoRate: 476, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 47, name: 'Red McKay', fargoRate: 450, wins: 2, losses: 1, status: 'IMMUNE' }, // No Rating defaulted to 450
  { rank: 48, name: 'Nicholas Windsor', fargoRate: 314, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 49, name: 'Matt Hammer', fargoRate: 391, wins: 2, losses: 2, status: 'ACTIVE' },
  { rank: 50, name: 'Alex Esquibal', fargoRate: 491, wins: 0, losses: 0, status: 'ACTIVE' }
];

const syncCurrentLadderData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the 499-under ladder
    const ladder = await Ladder.findOne({ name: '499-under' });
    if (!ladder) {
      console.log('❌ 499-under ladder not found');
      return;
    }

    // DELETE ALL CURRENT LADDER PLAYERS
    console.log('🗑️  Deleting all current ladder players...');
    await LadderPlayer.deleteMany({});
    console.log('✅ All ladder players deleted');

    // ADD ALL CURRENT PLAYERS FROM GOOGLE SHEET
    console.log('📝 Adding current ladder players from Google Sheet...');
    
    for (const playerData of currentLadderData) {
      const nameParts = playerData.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Set status based on player data
      let isActive = true;
      let immunityUntil = null;
      let vacationMode = false;
      let vacationUntil = null;
      
      if (playerData.status === 'VACATION') {
        vacationMode = true;
        vacationUntil = new Date();
        vacationUntil.setDate(vacationUntil.getDate() + 30); // 30 days vacation
      } else if (playerData.status === 'IMMUNE') {
        immunityUntil = new Date();
        immunityUntil.setDate(immunityUntil.getDate() + 7); // 7 days immunity
      } else if (playerData.status === 'NO SHOW/ANSW...') {
        isActive = false;
      }

      const player = new LadderPlayer({
        firstName,
        lastName,
        fargoRate: playerData.fargoRate,
        ladderId: ladder._id,
        ladderName: '499-under',
        position: playerData.rank,
        isActive,
        immunityUntil,
        vacationMode,
        vacationUntil,
        wins: playerData.wins,
        losses: playerData.losses,
        totalMatches: playerData.wins + playerData.losses
      });

      await player.save();
      console.log(`✅ Added: ${playerData.rank}. ${playerData.name} (${playerData.fargoRate}) - ${playerData.status}`);
    }

    console.log('\n🎉 Ladder data synced successfully!');
    console.log(`✅ Total players: ${currentLadderData.length}`);
    console.log('✅ All rankings, Fargo rates, wins, losses, and statuses preserved');
    console.log('✅ Account claiming should now work for all players');

  } catch (error) {
    console.error('❌ Error syncing ladder data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

console.log(`
🚀 SYNC CURRENT LADDER DATA
===========================

📋 This script will:
1. Delete all existing ladder players
2. Add all 50 players from your Google Sheet
3. Preserve exact rankings, Fargo rates, wins, losses
4. Set correct statuses (ACTIVE, VACATION, IMMUNE, NO SHOW)
5. Fix the "player not found" issue for account claiming

📊 Players to be added: ${currentLadderData.length}
🎯 Ladder: 499-under
`);

syncCurrentLadderData();
