import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';
import Ladder from '../src/models/Ladder.js';

dotenv.config();

// REAL ladder players from the Google Sheets screenshot
const realLadderPlayers = [
  { rank: 1, name: 'Brett Gonzalez', fargoRate: 471, wins: 15, losses: 2, status: 'ACTIVE' },
  { rank: 2, name: 'Tito Rodriguez', fargoRate: 463, wins: 8, losses: 6, status: 'ACTIVE' },
  { rank: 3, name: 'Lawrence Anaya', fargoRate: 455, wins: 3, losses: 4, status: 'ACTIVE' },
  { rank: 4, name: 'Ramsey Knowles', fargoRate: 470, wins: 7, losses: 2, status: 'ACTIVE' },
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
  { rank: 15, name: 'Darren Maya', fargoRate: 352, wins: 3, losses: 4, status: 'VACATION' },
  { rank: 16, name: 'Lyndi Navarrete', fargoRate: 421, wins: 3, losses: 1, status: 'ACTIVE' },
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
  { rank: 36, name: 'Jo Graclik', fargoRate: 400, wins: 2, losses: 2, status: 'ACTIVE' },
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
  { rank: 47, name: 'Red McKay', fargoRate: 450, wins: 2, losses: 2, status: 'IMMUNE' }, // No Rating defaulted to 450
  { rank: 48, name: 'Nicholas Windsor', fargoRate: 314, wins: 0, losses: 0, status: 'ACTIVE' },
  { rank: 49, name: 'Matt Hammer', fargoRate: 391, wins: 2, losses: 2, status: 'ACTIVE' },
  { rank: 50, name: 'Alex Esquibal', fargoRate: 491, wins: 0, losses: 0, status: 'ACTIVE' }
];

const fixWithRealData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const ladder = await Ladder.findOne({ name: '499-under' });
    if (!ladder) {
      console.log('❌ 499-under ladder not found');
      return;
    }

    // DELETE ALL CURRENT LADDER PLAYERS (including fake ones)
    console.log('🗑️  Deleting all current ladder players (including fake names)...');
    await LadderPlayer.deleteMany({});
    console.log('✅ All ladder players deleted');

    // ADD ONLY THE REAL PLAYERS
    console.log('📝 Adding REAL ladder players from Google Sheets...');
    
    for (const playerData of realLadderPlayers) {
      const nameParts = playerData.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Set status based on player data
      let isActive = true;
      let immunityUntil = null;
      
      if (playerData.status === 'VACATION') {
        isActive = false;
      } else if (playerData.status === 'IMMUNE') {
        immunityUntil = new Date();
        immunityUntil.setDate(immunityUntil.getDate() + 7);
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
        stats: {
          wins: playerData.wins,
          losses: playerData.losses
        }
      });

      await player.save();
      console.log(`✅ Added: ${playerData.rank}. ${playerData.name} (${playerData.fargoRate}) - ${playerData.status}`);
    }

    console.log('\n🎉 Ladder fixed with REAL data!');
    console.log(`✅ Total players: ${realLadderPlayers.length}`);
    console.log('✅ ALL fake names REMOVED');
    console.log('✅ Only real ladder players from Google Sheets are now in the database');
    console.log('✅ Mark Lanoue is NOT in the ladder (as it should be)');

    process.exit(0);

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
};

console.log(`
🔧 FIX LADDER WITH REAL DATA
============================

This script will:
1. Delete ALL current ladder players (including fake names)
2. Add ONLY the real players from the Google Sheets screenshot
3. Remove all fake names (Lisa Thompson, Michael Scott, David Wallace, etc.)
4. Set correct ranks, FargoRates, wins, losses, and statuses

📋 Real players to be added: ${realLadderPlayers.length}
`);

fixWithRealData();
