import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Win/loss data from the Google Sheet screenshot - columns D & E
const playerStats = [
  { firstName: 'Lucas', lastName: 'Taylor', wins: 3, losses: 0 },
  { firstName: 'Ruben', lastName: 'Silva', wins: 1, losses: 0 },
  { firstName: 'Mike', lastName: 'Thistlewood', wins: 1, losses: 0 },
  { firstName: 'Jahnzel', lastName: 'Rionn', wins: 3, losses: 0 },
  { firstName: 'Blaine', lastName: 'Myers', wins: 2, losses: 0 },
  { firstName: 'John', lastName: 'Burgess', wins: 1, losses: 1 },
  { firstName: 'Levi', lastName: 'Romero', wins: 1, losses: 1 },
  { firstName: 'Norberto', lastName: 'Montano', wins: 4, losses: 0 },
  { firstName: 'Noel', lastName: 'Montano Martinez', wins: 4, losses: 0 },
  { firstName: 'Timothy', lastName: 'Cole', wins: 3, losses: 0 },
  { firstName: 'Randy', lastName: 'Ramirez', wins: 2, losses: 0 },
  { firstName: 'Donavin', lastName: 'Warson', wins: 1, losses: 0 },
  { firstName: 'Anthony', lastName: 'Zapf', wins: 1, losses: 0 },
  { firstName: 'Chris', lastName: 'Standley', wins: 1, losses: 1 },
  { firstName: 'Jon', lastName: 'Glennon', wins: 1, losses: 0 },
  { firstName: 'Johnathan', lastName: 'Tate', wins: 1, losses: 1 },
  { firstName: 'Drew', lastName: 'Rieck', wins: 2, losses: 0 }
];

const updateLadderStats = async () => {
  try {
    console.log('Starting ladder stats update from screenshot...');
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const playerStat of playerStats) {
      // Find the player by name
      const player = await LadderPlayer.findOne({
        firstName: playerStat.firstName,
        lastName: playerStat.lastName
      });
      
             if (player) {
         // Update the stats - use direct fields, not stats object
         player.wins = playerStat.wins;
         player.losses = playerStat.losses;
        
        await player.save();
        console.log(`✅ Updated ${playerStat.firstName} ${playerStat.lastName}: ${playerStat.wins}W/${playerStat.losses}L`);
        updatedCount++;
      } else {
        console.log(`⚠️  Player ${playerStat.firstName} ${playerStat.lastName} not found, skipping...`);
        skippedCount++;
      }
    }
    
    console.log('\n🎉 Ladder stats update completed!');
    console.log(`📊 Summary: ${updatedCount} players updated, ${skippedCount} players skipped`);
    
    // Show final stats summary
    console.log('\n📊 Current Ladder Stats:');
    const allPlayers = await LadderPlayer.find().sort({ ladderName: 1, position: 1 });
    
    let currentLadder = '';
    allPlayers.forEach(player => {
      if (player.ladderName !== currentLadder) {
        currentLadder = player.ladderName;
        console.log(`\n${currentLadder.toUpperCase()}:`);
      }
             console.log(`  ${player.position}. ${player.firstName} ${player.lastName} - ${player.wins}W/${player.losses}L`);
    });
    
  } catch (error) {
    console.error('Error updating ladder stats:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

// Run the update
connectDB().then(updateLadderStats);
