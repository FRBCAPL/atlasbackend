import mongoose from 'mongoose';
import ChallengeStats from '../src/models/ChallengeStats.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/poolleague');

async function fixChallengeStats() {
  try {
    console.log('Starting challenge stats fix...');
    
    // Get all challenge stats
    const allStats = await ChallengeStats.find({});
    console.log(`Found ${allStats.length} challenge stats records`);
    
    let fixedCount = 0;
    
    for (const stats of allStats) {
      const originalTotal = stats.totalChallengeMatches;
      const calculatedTotal = stats.matchesAsChallenger + stats.matchesAsDefender;
      
      if (originalTotal !== calculatedTotal) {
        console.log(`Fixing ${stats.playerName} in ${stats.division}:`);
        console.log(`  Original totalChallengeMatches: ${originalTotal}`);
        console.log(`  Calculated total: ${calculatedTotal} (matchesAsChallenger: ${stats.matchesAsChallenger} + matchesAsDefender: ${stats.matchesAsDefender})`);
        
        // Update the totalChallengeMatches to the correct calculated value
        stats.totalChallengeMatches = calculatedTotal;
        await stats.save();
        
        console.log(`  Fixed: totalChallengeMatches = ${calculatedTotal}`);
        fixedCount++;
      }
    }
    
    console.log(`\nFix completed! Fixed ${fixedCount} out of ${allStats.length} records.`);
    
  } catch (error) {
    console.error('Error fixing challenge stats:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixChallengeStats();
