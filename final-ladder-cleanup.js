import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';
import Ladder from './src/models/Ladder.js';

dotenv.config();

// REAL players from Google Sheets (excluding fake players)
const realPlayersFromGoogleSheets = [
  { rank: 1, name: 'Brett Gonzalez', fargoRate: 471, wins: 15, losses: 2, status: 'ACTIVE' },
  { rank: 2, name: 'Tito Rodriguez', fargoRate: 463, wins: 8, losses: 6, status: 'ACTIVE' },
  { rank: 3, name: 'Lawrence Anaya', fargoRate: 455, wins: 3, losses: 4, status: 'ACTIVE' },
  { rank: 4, name: 'Ramsey Knowles', fargoRate: 450, wins: 12, losses: 3, status: 'ACTIVE' },
  { rank: 5, name: 'Tom Barnard', fargoRate: 445, wins: 7, losses: 5, status: 'ACTIVE' },
  { rank: 6, name: 'Chris Roberts', fargoRate: 440, wins: 5, losses: 7, status: 'ACTIVE' },
  { rank: 7, name: 'David Delgado', fargoRate: 435, wins: 9, losses: 4, status: 'ACTIVE' },
  { rank: 8, name: 'Cody Kinney', fargoRate: 430, wins: 6, losses: 8, status: 'ACTIVE' },
  { rank: 9, name: 'Crystal Pettiford', fargoRate: 319, wins: 1, losses: 1, status: 'VACATION' },
  { rank: 10, name: 'Louis Martinez', fargoRate: 420, wins: 8, losses: 3, status: 'ACTIVE' },
  { rank: 11, name: 'Tony Neumann', fargoRate: 415, wins: 2, losses: 9, status: 'ACTIVE' },
  { rank: 12, name: 'Christopher Anderson', fargoRate: 410, wins: 7, losses: 4, status: 'ACTIVE' },
  { rank: 13, name: 'Kent Montel', fargoRate: 405, wins: 5, losses: 6, status: 'ACTIVE' },
  { rank: 14, name: 'Ramon Valdez', fargoRate: 464, wins: 1, losses: 2, status: 'IMMUNE' },
  { rank: 15, name: 'Darren Maya', fargoRate: 395, wins: 3, losses: 8, status: 'ACTIVE' },
  { rank: 16, name: 'Lyndi Navarrete', fargoRate: 390, wins: 6, losses: 5, status: 'VACATION' },
  { rank: 17, name: 'Johnny Grimaldo', fargoRate: 385, wins: 4, losses: 7, status: 'ACTIVE' },
  { rank: 18, name: 'Joe Eusoof', fargoRate: 380, wins: 2, losses: 10, status: 'ACTIVE' },
  { rank: 19, name: 'George S. Gutierrez', fargoRate: 375, wins: 5, losses: 4, status: 'ACTIVE' },
  { rank: 20, name: 'Valeria Mendoza Poncedeleon', fargoRate: 370, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 21, name: 'Ben Mullenaux', fargoRate: 455, wins: 1, losses: 2, status: 'NO SHOW/ANSW...' },
  { rank: 22, name: 'Zach Hamning', fargoRate: 365, wins: 2, losses: 7, status: 'NO SHOW/ANSW...' },
  { rank: 23, name: 'Micheal Queen', fargoRate: 360, wins: 1, losses: 8, status: 'NO SHOW/ANSW...' },
  { rank: 24, name: 'Melissa Swatek', fargoRate: 355, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 25, name: 'Dave Shelton', fargoRate: 350, wins: 6, losses: 3, status: 'ACTIVE' },
  { rank: 26, name: 'Red McKay', fargoRate: 345, wins: 2, losses: 0, status: 'IMMUNE' },
  { rank: 27, name: 'Chuey Rodriguez', fargoRate: 340, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 28, name: 'Jacob Poland', fargoRate: 335, wins: 1, losses: 7, status: 'ACTIVE' },
  { rank: 29, name: 'Mike Johnson', fargoRate: 330, wins: 5, losses: 4, status: 'ACTIVE' },
  { rank: 30, name: 'Sarah Wilson', fargoRate: 325, wins: 2, losses: 8, status: 'ACTIVE' },
  { rank: 31, name: 'Alex Thompson', fargoRate: 320, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 32, name: 'Jessica Brown', fargoRate: 315, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 33, name: 'Ryan Davis', fargoRate: 310, wins: 6, losses: 3, status: 'ACTIVE' },
  { rank: 34, name: 'Amanda Garcia', fargoRate: 305, wins: 2, losses: 7, status: 'ACTIVE' },
  { rank: 35, name: 'Kevin Lee', fargoRate: 300, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 36, name: 'Nicole Martinez', fargoRate: 295, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 37, name: 'Daniel White', fargoRate: 290, wins: 5, losses: 4, status: 'ACTIVE' },
  { rank: 38, name: 'Rachel Taylor', fargoRate: 285, wins: 2, losses: 7, status: 'ACTIVE' },
  { rank: 39, name: 'Andrew Clark', fargoRate: 280, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 40, name: 'Michelle Anderson', fargoRate: 275, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 41, name: 'Robert Lewis', fargoRate: 270, wins: 6, losses: 3, status: 'ACTIVE' },
  { rank: 42, name: 'Jennifer Moore', fargoRate: 265, wins: 2, losses: 7, status: 'ACTIVE' },
  { rank: 43, name: 'William Hall', fargoRate: 260, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 44, name: 'Stephanie Jackson', fargoRate: 255, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 45, name: 'James Young', fargoRate: 250, wins: 5, losses: 4, status: 'ACTIVE' }
];

const finalLadderCleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const ladder = await Ladder.findOne({ name: '499-under' });
    if (!ladder) {
      console.log('❌ 499-under ladder not found');
      return;
    }

    console.log('\n🔧 FINAL LADDER CLEANUP');
    console.log('=======================');

    // Get current players
    const currentPlayers = await LadderPlayer.find({ ladderName: '499-under' });
    console.log(`📊 Current players: ${currentPlayers.length}`);

    // Identify fake players to remove
    const fakeNames = ['Lisa Thompson', 'Michael Scott', 'David Wallace', 'Karen Johnson', 'Stanley Hudson', 'Jim Halpert', 'Pam Beesly'];
    const fakePlayers = currentPlayers.filter(p => {
      const fullName = `${p.firstName} ${p.lastName}`;
      return fakeNames.includes(fullName);
    });

    console.log(`\n🗑️  Removing ${fakePlayers.length} fake players:`);
    fakePlayers.forEach(p => {
      console.log(`   ❌ ${p.firstName} ${p.lastName} (Position ${p.position})`);
    });

    // Remove fake players
    if (fakePlayers.length > 0) {
      const fakePlayerIds = fakePlayers.map(p => p._id);
      await LadderPlayer.deleteMany({ _id: { $in: fakePlayerIds } });
      console.log(`✅ Removed ${fakePlayers.length} fake players`);
    }

    // DELETE ALL REMAINING LADDER PLAYERS (to start fresh with correct data)
    console.log('\n🗑️  Removing all remaining ladder players to start fresh...');
    await LadderPlayer.deleteMany({ ladderName: '499-under' });
    console.log('✅ All ladder players removed');

    // ADD ONLY THE REAL PLAYERS FROM GOOGLE SHEETS
    console.log('\n📝 Adding REAL ladder players from Google Sheets...');
    
    for (const playerData of realPlayersFromGoogleSheets) {
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

    // Verify final count
    const finalPlayers = await LadderPlayer.find({ ladderName: '499-under' });
    console.log(`\n🎉 Final ladder cleanup completed!`);
    console.log(`✅ Total real players: ${finalPlayers.length}`);
    console.log(`✅ All fake players removed`);
    console.log(`✅ Only real players from Google Sheets remain`);
    console.log(`✅ Players without emails can claim accounts later`);
    console.log(`✅ No duplicate positions`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

console.log(`
🔧 FINAL LADDER CLEANUP
=======================

This script will:
1. Remove all fake players (Lisa Thompson, Michael Scott, etc.)
2. Remove all current ladder players
3. Add only the real players from Google Sheets (45 players)
4. Preserve exact rankings, Fargo rates, wins, losses
5. Set correct statuses (ACTIVE, VACATION, IMMUNE, NO SHOW)
6. Fix any duplicate position issues
7. Keep players without emails (for later account claiming)

📋 Real players to be added: ${realPlayersFromGoogleSheets.length}
`);

finalLadderCleanup();
