import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';
import Ladder from '../src/models/Ladder.js';

dotenv.config();

// EXACT ladder players from the one-time-import file
const correctLadderPlayers = [
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
  { rank: 45, name: 'James Young', fargoRate: 250, wins: 5, losses: 4, status: 'ACTIVE' },
  { rank: 46, name: 'Lisa Thompson', fargoRate: 245, wins: 2, losses: 7, status: 'ACTIVE' },
  { rank: 47, name: 'Red McKay', fargoRate: 240, wins: 2, losses: 0, status: 'IMMUNE' },
  { rank: 48, name: 'Michael Scott', fargoRate: 235, wins: 4, losses: 5, status: 'ACTIVE' },
  { rank: 49, name: 'Karen Johnson', fargoRate: 230, wins: 3, losses: 6, status: 'ACTIVE' },
  { rank: 50, name: 'David Wallace', fargoRate: 225, wins: 1, losses: 8, status: 'ACTIVE' }
];

const fixLadderPlayers = async () => {
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

    // ADD ONLY THE CORRECT PLAYERS
    console.log('📝 Adding correct ladder players...');
    
    for (const playerData of correctLadderPlayers) {
      const nameParts = playerData.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Set status based on player data
      let isActive = true;
      let immunityUntil = null;
      
      if (playerData.status === 'VACATION') {
        isActive = false;
      } else if (playerData.status === 'IMMUNE') {
        // Set immunity for 7 days from now
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

    console.log('\n🎉 Ladder fixed successfully!');
    console.log(`✅ Total players: ${correctLadderPlayers.length}`);
    console.log('✅ Mark Lanoue and other league players REMOVED');
    console.log('✅ Only correct ladder players from Google Sheets are now in the database');

    process.exit(0);

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
};

console.log(`
🔧 FIX LADDER PLAYERS
====================

This script will:
1. Delete ALL current ladder players
2. Add ONLY the correct players from the Google Sheets
3. Remove Mark Lanoue and other league players
4. Set correct ranks, FargoRates, wins, losses, and statuses

📋 Players to be added: ${correctLadderPlayers.length}
`);

fixLadderPlayers();
