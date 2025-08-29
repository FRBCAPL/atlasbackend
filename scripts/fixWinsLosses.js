import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';

dotenv.config();

// Current ladder data with correct wins and losses
const playerStats = [
  { firstName: 'Brett', lastName: 'Gonzalez', wins: 15, losses: 2 },
  { firstName: 'Tito', lastName: 'Rodriguez', wins: 8, losses: 6 },
  { firstName: 'Lawrence', lastName: 'Anaya', wins: 3, losses: 4 },
  { firstName: 'Ramsey', lastName: 'Knowles', wins: 7, losses: 8 },
  { firstName: 'Tom', lastName: 'Barnard', wins: 7, losses: 2 },
  { firstName: 'Chris', lastName: 'Roberts', wins: 3, losses: 3 },
  { firstName: 'David', lastName: 'Delgado', wins: 3, losses: 3 },
  { firstName: 'Cody', lastName: 'Kinney', wins: 6, losses: 3 },
  { firstName: 'Crystal', lastName: 'Pettiford', wins: 1, losses: 1 },
  { firstName: 'Louis', lastName: 'Martinez', wins: 2, losses: 2 },
  { firstName: 'Tony', lastName: 'Neumann', wins: 5, losses: 1 },
  { firstName: 'Christopher', lastName: 'Anderson', wins: 2, losses: 3 },
  { firstName: 'Kent', lastName: 'Montel', wins: 1, losses: 2 },
  { firstName: 'Ramon', lastName: 'Valdez', wins: 2, losses: 2 },
  { firstName: 'Darren', lastName: 'Maya', wins: 4, losses: 1 },
  { firstName: 'Lyndi', lastName: 'Navarrete', wins: 3, losses: 1 },
  { firstName: 'Johnny', lastName: 'Grimaldo', wins: 1, losses: 2 },
  { firstName: 'Joe', lastName: 'Eusoof', wins: 2, losses: 2 },
  { firstName: 'Erlon', lastName: 'Calderon', wins: 1, losses: 1 },
  { firstName: 'Ethienne', lastName: 'Rodriguez', wins: 3, losses: 1 },
  { firstName: 'George S.', lastName: 'Gutierrez', wins: 1, losses: 4 },
  { firstName: 'Ben', lastName: 'Mullenaux', wins: 1, losses: 2 },
  { firstName: 'Zach', lastName: 'Hamning', wins: 2, losses: 2 },
  { firstName: 'Micheal', lastName: 'Queen', wins: 1, losses: 1 },
  { firstName: 'Victor', lastName: 'Burgos', wins: 2, losses: 2 },
  { firstName: 'Sam', lastName: 'Merritt', wins: 3, losses: 3 },
  { firstName: 'Rob', lastName: 'Weaver', wins: 0, losses: 0 },
  { firstName: 'Jeremy', lastName: 'Watt', wins: 0, losses: 0 },
  { firstName: 'Rick', lastName: 'Romero', wins: 0, losses: 0 },
  { firstName: 'Kent', lastName: 'Peterson', wins: 3, losses: 2 },
  { firstName: 'Christopher', lastName: 'Sisneros', wins: 1, losses: 1 },
  { firstName: 'Gary', lastName: 'Cogzell', wins: 1, losses: 2 },
  { firstName: 'John', lastName: 'Witherbee', wins: 0, losses: 0 },
  { firstName: 'Vince', lastName: 'Arellano', wins: 0, losses: 0 },
  { firstName: 'Dave', lastName: 'Shelton', wins: 1, losses: 1 },
  { firstName: 'Jo', lastName: 'Graclik', wins: 2, losses: 1 },
  { firstName: 'Valeria Mendoza', lastName: 'Poncedeleon', wins: 1, losses: 1 },
  { firstName: 'Jordan', lastName: 'Tiona', wins: 1, losses: 2 },
  { firstName: 'Mario', lastName: 'Zimmerman', wins: 2, losses: 1 },
  { firstName: 'Lorenzo', lastName: 'Avila', wins: 1, losses: 1 },
  { firstName: 'Melissa', lastName: 'Swatek', wins: 0, losses: 0 },
  { firstName: 'Raymond', lastName: 'Carlson', wins: 0, losses: 0 },
  { firstName: 'Christopher', lastName: 'Edl', wins: 1, losses: 1 },
  { firstName: 'Jacob', lastName: 'Poland', wins: 1, losses: 3 },
  { firstName: 'James', lastName: 'Duckworth', wins: 0, losses: 0 },
  { firstName: 'Kevin', lastName: 'Santiesteban', wins: 0, losses: 0 },
  { firstName: 'Red', lastName: 'McKay', wins: 2, losses: 1 },
  { firstName: 'Nicholas', lastName: 'Windsor', wins: 0, losses: 0 },
  { firstName: 'Matt', lastName: 'Hammer', wins: 2, losses: 2 },
  { firstName: 'Alex', lastName: 'Esquibal', wins: 0, losses: 0 }
];

const fixWinsLosses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📝 Updating wins and losses for all ladder players...');
    
    let updated = 0;
    
    for (const playerStat of playerStats) {
      const player = await LadderPlayer.findOne({
        firstName: playerStat.firstName,
        lastName: playerStat.lastName,
        ladderName: '499-under'
      });

      if (player) {
        player.wins = playerStat.wins;
        player.losses = playerStat.losses;
        player.totalMatches = playerStat.wins + playerStat.losses;
        
        await player.save();
        console.log(`✅ Updated: ${playerStat.firstName} ${playerStat.lastName} - ${playerStat.wins}W/${playerStat.losses}L`);
        updated++;
      } else {
        console.log(`❌ Player not found: ${playerStat.firstName} ${playerStat.lastName}`);
      }
    }

    console.log('\n🎉 Wins and losses updated successfully!');
    console.log(`✅ Updated ${updated} players`);

  } catch (error) {
    console.error('❌ Error updating wins and losses:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

console.log(`
🚀 FIX WINS AND LOSSES
======================

📋 This script will:
1. Find all ladder players by name
2. Update their wins and losses from Google Sheet data
3. Calculate total matches
4. Preserve all other data

📊 Players to update: ${playerStats.length}
🎯 Ladder: 499-under
`);

fixWinsLosses();
