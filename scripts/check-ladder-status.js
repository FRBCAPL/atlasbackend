import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';
import Ladder from '../src/models/Ladder.js';

dotenv.config();

const checkLadderStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Check existing ladders
    const ladders = await Ladder.find({}).sort({ minRating: 1 });
    console.log('=== Current Ladders ===');
    ladders.forEach(ladder => {
      console.log(`${ladder.displayName}: ${ladder.minRating}-${ladder.maxRating} (${ladder.name})`);
    });

    // Check players by ladder
    console.log('\n=== Player Distribution ===');
    
    const ladderNames = ['499-under', '500-549', '550-plus'];
    
    for (const ladderName of ladderNames) {
      const players = await LadderPlayer.find({ ladderName }).sort({ position: 1 });
      console.log(`\n${ladderName.toUpperCase()}: ${players.length} players`);
      
      if (players.length > 0) {
        console.log('Top 5 players:');
        players.slice(0, 5).forEach((player, index) => {
          console.log(`  ${index + 1}. ${player.firstName} ${player.lastName} (${player.fargoRate}) - Position ${player.position}`);
        });
      }
    }

    // Check for any players that might be in wrong ladders
    console.log('\n=== Potential Issues ===');
    
    const allPlayers = await LadderPlayer.find({});
    const issues = [];
    
    allPlayers.forEach(player => {
      let expectedLadder;
      if (player.fargoRate <= 499) {
        expectedLadder = '499-under';
      } else if (player.fargoRate >= 500 && player.fargoRate <= 549) {
        expectedLadder = '500-549';
      } else if (player.fargoRate >= 550) {
        expectedLadder = '550-plus';
      }
      
      if (expectedLadder && player.ladderName !== expectedLadder) {
        issues.push({
          player: `${player.firstName} ${player.lastName}`,
          email: player.email,
          fargoRate: player.fargoRate,
          currentLadder: player.ladderName,
          expectedLadder: expectedLadder
        });
      }
    });
    
    if (issues.length > 0) {
      console.log('Players in wrong ladders:');
      issues.forEach(issue => {
        console.log(`  - ${issue.player} (${issue.email}): ${issue.fargoRate} → ${issue.currentLadder} (should be ${issue.expectedLadder})`);
      });
    } else {
      console.log('No ladder assignment issues found!');
    }

    // Summary
    console.log('\n=== Summary ===');
    const totalPlayers = await LadderPlayer.countDocuments();
    console.log(`Total players: ${totalPlayers}`);
    
    ladderNames.forEach(async (ladderName) => {
      const count = await LadderPlayer.countDocuments({ ladderName });
      console.log(`${ladderName}: ${count} players`);
    });

    console.log('\nCheck completed!');
    process.exit(0);

  } catch (error) {
    console.error('Error checking ladder status:', error);
    process.exit(1);
  }
};

checkLadderStatus();
