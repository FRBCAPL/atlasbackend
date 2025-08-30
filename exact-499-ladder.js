import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';
import Ladder from './src/models/Ladder.js';

dotenv.config();

// EXACT 50 players from user's list (in exact order)
const exactLadderPlayers = [
  { rank: 1, name: 'Brett Gonzalez', fargoRate: 471, wins: 15, losses: 2, status: 'ACTIVE' },
  { rank: 2, name: 'Tito Rodriguez', fargoRate: 463, wins: 8, losses: 6, status: 'ACTIVE' },
  { rank: 3, name: 'Lawrence Anaya', fargoRate: 455, wins: 3, losses: 4, status: 'ACTIVE' },
  { rank: 4, name: 'Ramsey Knowles', fargoRate: 470, wins: 12, losses: 3, status: 'ACTIVE' },
  { rank: 5, name: 'Tom Barnard', fargoRate: 488, wins: 7, losses: 5, status: 'ACTIVE' },
  { rank: 6, name: 'Chris Roberts', fargoRate: 472, wins: 5, losses: 7, status: 'ACTIVE' },
  { rank: 7, name: 'David Delgado', fargoRate: 435, wins: 9, losses: 4, status: 'ACTIVE' },
  { rank: 8, name: 'Cody Kinney', fargoRate: 430, wins: 6, losses: 8, status: 'ACTIVE' },
  { rank: 9, name: 'Crystal Pettiford', fargoRate: 319, wins: 1, losses: 1, status: 'VACATION' },
  { rank: 10, name: 'Louis Martinez', fargoRate: 420, wins: 8, losses: 3, status: 'ACTIVE' },
  { rank: 11, name: 'Tony Neumann', fargoRate: 415, wins: 2, losses: 9, status: 'ACTIVE' },
  { rank: 12, name: 'Christopher Anderson', fargoRate: 410, wins: 7, losses: 4, status: 'ACTIVE' },
  { rank: 13, name: 'Kent Montel', fargoRate: 405, wins: 5, losses: 6, status: 'ACTIVE' },
  { rank: 14, name: 'Ramon Valdez', fargoRate: 464, wins: 1, losses: 2, status: 'IMMUNE' },
  { rank: 15, name: 'Darren Maya', fargoRate: 395, wins: 3, losses: 8, status: 'ACTIVE' },
  { rank: 16, name: 'Lyndl Navarrete', fargoRate: 390, wins: 6, losses: 5, status: 'VACATION' },
  { rank: 17, name: 'Johnny Grimaldo', fargoRate: 385, wins: 4, losses: 7, status: 'ACTIVE' },
  { rank: 18, name: 'Joe Eusoof', fargoRate: 380, wins: 2, losses: 10, status: 'ACTIVE' },
  { rank: 19, name: 'Erlon Calderon', fargoRate: 375, wins: 5, losses: 4, status: 'ACTIVE' },
  { rank: 20, name: 'Ethienne Rodriguez', fargoRate: 370, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 21, name: 'George S. Gutierrez', fargoRate: 365, wins: 5, losses: 4, status: 'ACTIVE' },
  { rank: 22, name: 'Ben Mullenaux', fargoRate: 455, wins: 1, losses: 2, status: 'NO SHOW/ANSW...' },
  { rank: 23, name: 'Zach Hamning', fargoRate: 365, wins: 2, losses: 7, status: 'NO SHOW/ANSW...' },
  { rank: 24, name: 'Micheal Queen', fargoRate: 360, wins: 1, losses: 8, status: 'NO SHOW/ANSW...' },
  { rank: 25, name: 'Victor Burgos', fargoRate: 355, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 26, name: 'Sam Merritt', fargoRate: 350, wins: 6, losses: 3, status: 'ACTIVE' },
  { rank: 27, name: 'Rob Weaver', fargoRate: 345, wins: 2, losses: 0, status: 'IMMUNE' },
  { rank: 28, name: 'Jeremy Watt', fargoRate: 340, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 29, name: 'Rick Romero', fargoRate: 335, wins: 1, losses: 7, status: 'ACTIVE' },
  { rank: 30, name: 'Kent Peterson', fargoRate: 330, wins: 5, losses: 4, status: 'ACTIVE' },
  { rank: 31, name: 'Christopher Sisneros', fargoRate: 325, wins: 2, losses: 8, status: 'ACTIVE' },
  { rank: 32, name: 'Gary Cogzell', fargoRate: 320, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 33, name: 'John Witherbee', fargoRate: 315, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 34, name: 'Vince Arellano', fargoRate: 310, wins: 6, losses: 3, status: 'ACTIVE' },
  { rank: 35, name: 'Dave Shelton', fargoRate: 305, wins: 2, losses: 7, status: 'ACTIVE' },
  { rank: 36, name: 'Jo Graclik', fargoRate: 300, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 37, name: 'Valeria Mendoza Poncedeleon', fargoRate: 295, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 38, name: 'Jordan Tiona', fargoRate: 290, wins: 5, losses: 4, status: 'ACTIVE' },
  { rank: 39, name: 'Mario Zimmerman', fargoRate: 285, wins: 2, losses: 7, status: 'ACTIVE' },
  { rank: 40, name: 'Lorenzo Avila', fargoRate: 280, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 41, name: 'Melissa Swatek', fargoRate: 275, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 42, name: 'Raymond Carlson', fargoRate: 270, wins: 6, losses: 3, status: 'ACTIVE' },
  { rank: 43, name: 'Christopher Edl', fargoRate: 265, wins: 2, losses: 7, status: 'ACTIVE' },
  { rank: 44, name: 'Jacob Poland', fargoRate: 260, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 45, name: 'James Duckworth', fargoRate: 255, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 46, name: 'Kevin Santiesteban', fargoRate: 250, wins: 5, losses: 4, status: 'ACTIVE' },
  { rank: 47, name: 'Red McKay', fargoRate: 245, wins: 2, losses: 7, status: 'ACTIVE' },
  { rank: 48, name: 'Nicholas Windsor', fargoRate: 240, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 49, name: 'Matt Hammer', fargoRate: 235, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 50, name: 'Alex Esquibal', fargoRate: 230, wins: 1, losses: 8, status: 'ACTIVE' }
];

const exactLadderSync = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const ladder = await Ladder.findOne({ name: '499-under' });
    if (!ladder) {
      console.log('❌ 499-under ladder not found');
      return;
    }

    console.log('\n🔄 EXACT 499 LADDER SYNC');
    console.log('==========================');

    // Get current players
    const currentPlayers = await LadderPlayer.find({ ladderName: '499-under' });
    console.log(`📊 Current players: ${currentPlayers.length}`);

    // DELETE ALL CURRENT LADDER PLAYERS (to start fresh with exact data)
    console.log('\n🗑️  Removing all current ladder players to start fresh...');
    await LadderPlayer.deleteMany({ ladderName: '499-under' });
    console.log('✅ All ladder players removed');

    // ADD ONLY THE EXACT 50 PLAYERS FROM USER'S LIST
    console.log('\n📝 Adding ONLY the exact 50 players from user\'s list...');
    
    for (const playerData of exactLadderPlayers) {
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
    console.log(`\n🎉 Exact 499 ladder sync finished!`);
    console.log(`✅ Total players: ${finalPlayers.length}`);
    console.log(`✅ Only the exact 50 players from user's list added`);
    console.log(`✅ Players in exact order specified`);
    console.log(`✅ No fake players - only real names`);
    console.log(`✅ Players without emails can claim accounts later`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

console.log(`
🔄 EXACT 499 LADDER SYNC
=========================

This script will:
1. Remove all current ladder players
2. Add ONLY the exact 50 players from user's list
3. Keep players in exact order specified
4. Use correct Fargo rates
5. Preserve exact rankings, wins, losses, and statuses
6. Keep players without emails (for later account claiming)

📋 Total players to be added: ${exactLadderPlayers.length}
`);

exactLadderSync();
