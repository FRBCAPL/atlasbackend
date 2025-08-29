import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';
import Ladder from '../src/models/Ladder.js';
import bcrypt from 'bcryptjs';

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

// Real ladder data from the screenshot - parsed from the 500+ ladder
const ladderData = [
  // Players from the screenshot with their actual Fargo rates and match history
  { firstName: 'Lucas', lastName: 'Taylor', fargoRate: 639, position: 1, isActive: true, wins: 1, losses: 0 },
  { firstName: 'Ruben', lastName: 'Silva', fargoRate: 712, position: 2, isActive: true, wins: 1, losses: 0 },
  { firstName: 'Mike', lastName: 'Thistlewood', fargoRate: 511, position: 3, isActive: true, wins: 0, losses: 0 },
  { firstName: 'Jahnzel', lastName: 'Rionn', fargoRate: 558, position: 4, isActive: true, wins: 0, losses: 0 },
  { firstName: 'Blaine', lastName: 'Myers', fargoRate: 500, position: 5, isActive: true, wins: 0, losses: 0 },
  { firstName: 'John', lastName: 'Burgess', fargoRate: 582, position: 6, isActive: true, wins: 0, losses: 1 },
  { firstName: 'Levi', lastName: 'Romero', fargoRate: 510, position: 7, isActive: true, wins: 0, losses: 1 },
  { firstName: 'Norberto', lastName: 'Montano', fargoRate: 520, position: 8, isActive: true, wins: 0, losses: 0 },
  { firstName: 'Noel', lastName: 'Montano Martinez', fargoRate: 572, position: 9, isActive: true, wins: 0, losses: 1 },
  { firstName: 'Timothy', lastName: 'Cole', fargoRate: 506, position: 10, isActive: false, wins: 2, losses: 0 }, // On vacation
  { firstName: 'Randy', lastName: 'Ramirez', fargoRate: 576, position: 11, isActive: true, wins: 1, losses: 0 },
  { firstName: 'Donavin', lastName: 'Warson', fargoRate: 521, position: 12, isActive: true, wins: 1, losses: 0 },
  { firstName: 'Anthony', lastName: 'Zapf', fargoRate: 581, position: 13, isActive: true, wins: 1, losses: 0 },
  { firstName: 'Chris', lastName: 'Standley', fargoRate: 516, position: 14, isActive: true, wins: 0, losses: 1 },
  { firstName: 'Jon', lastName: 'Glennon', fargoRate: 500, position: 15, isActive: true, wins: 1, losses: 0 },
  { firstName: 'Johnathan', lastName: 'Tate', fargoRate: 532, position: 16, isActive: true, wins: 0, losses: 1 },
  { firstName: 'Drew', lastName: 'Rieck', fargoRate: 525, position: 17, isActive: true, wins: 0, losses: 1 }
];

const determineLadderName = (fargoRate) => {
  if (fargoRate <= 499) return '499-under';
  if (fargoRate >= 500 && fargoRate <= 549) return '500-549';
  if (fargoRate >= 550) return '550-plus';
  return '499-under'; // Default fallback
};

const generateEmail = (firstName, lastName) => {
  // Generate a placeholder email - you can update these with real emails later
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@legendsoflegends.com`;
};

const importLadderData = async () => {
  try {
    console.log('Starting ladder data import from screenshot...');
    
    // Group players by ladder based on Fargo rate
    const playersByLadder = {
      '499-under': [],
      '500-549': [],
      '550-plus': []
    };
    
    // Sort and group players
    ladderData.forEach(player => {
      const ladderName = determineLadderName(player.fargoRate);
      playersByLadder[ladderName].push({
        ...player,
        email: generateEmail(player.firstName, player.lastName)
      });
    });
    
    // Keep original order from screenshot (current standings) - no sorting needed
    
    console.log('\n📊 Players grouped by ladder:');
    Object.keys(playersByLadder).forEach(ladderName => {
      console.log(`${ladderName}: ${playersByLadder[ladderName].length} players`);
      playersByLadder[ladderName].forEach(player => {
        console.log(`  - ${player.firstName} ${player.lastName} (Fargo: ${player.fargoRate}, Position: ${player.position})`);
      });
    });
    
    // Import players for each ladder
    for (const [ladderName, players] of Object.entries(playersByLadder)) {
      if (players.length === 0) {
        console.log(`\n⏭️  No players for ${ladderName} ladder, skipping...`);
        continue;
      }
      
      console.log(`\n📥 Importing ${players.length} players to ${ladderName} ladder...`);
      
      // Get the ladder
      const ladder = await Ladder.findOne({ name: ladderName });
      if (!ladder) {
        console.error(`❌ Ladder ${ladderName} not found!`);
        continue;
      }
      
      // Import each player
      for (let i = 0; i < players.length; i++) {
        const playerData = players[i];
        
        // Check if player already exists
        const existingPlayer = await LadderPlayer.findOne({ email: playerData.email });
        if (existingPlayer) {
          console.log(`⚠️  Player ${playerData.firstName} ${playerData.lastName} already exists, skipping...`);
          continue;
        }
        
        // Generate a random PIN (4 digits)
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        const hashedPin = await bcrypt.hash(pin, 10);
        
                 // Create new player
         const newPlayer = new LadderPlayer({
           firstName: playerData.firstName,
           lastName: playerData.lastName,
           email: playerData.email,
           pin: hashedPin,
           fargoRate: playerData.fargoRate,
           ladderId: ladder._id,
           ladderName: ladderName,
           position: playerData.position, // Keep original position from screenshot
           isActive: playerData.isActive,
           stats: {
             wins: playerData.wins || 0,
             losses: playerData.losses || 0
           }
         });
        
        await newPlayer.save();
                 console.log(`✅ Added ${playerData.firstName} ${playerData.lastName} (Fargo: ${playerData.fargoRate}) to ${ladderName} ladder at position ${playerData.position}`);
        console.log(`   Email: ${playerData.email}, PIN: ${pin}`);
      }
    }
    
    console.log('\n🎉 Ladder data import completed successfully!');
    
    // Show final summary
    const summary = await Promise.all(
      Object.keys(playersByLadder).map(async (ladderName) => {
        const count = await LadderPlayer.countDocuments({ ladderName });
        return { ladderName, count };
      })
    );
    
    console.log('\n📊 Final Ladder Summary:');
    summary.forEach(({ ladderName, count }) => {
      console.log(`${ladderName}: ${count} players`);
    });
    
  } catch (error) {
    console.error('Error importing ladder data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

// Run the import
connectDB().then(importLadderData); 