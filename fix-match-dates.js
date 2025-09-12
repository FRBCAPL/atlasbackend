/**
 * Fix existing match dates in the database
 * Run this from the atlasbackend directory: node fix-match-dates.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderMatch from './src/models/LadderMatch.js';

// Load environment variables
dotenv.config();

async function fixMatchDates() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all completed matches
    const matches = await LadderMatch.find({ status: 'completed' })
      .populate('player1 player2', 'firstName lastName')
      .sort({ completedDate: -1 });

    console.log(`📊 Found ${matches.length} completed matches to review`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const match of matches) {
      try {
        const player1Name = match.player1 ? `${match.player1.firstName} ${match.player1.lastName}` : 'Unknown';
        const player2Name = match.player2 ? `${match.player2.firstName} ${match.player2.lastName}` : 'Unknown';
        
        console.log(`\n🔍 ${player1Name} vs ${player2Name}`);
        console.log(`   Scheduled: ${match.scheduledDate}`);
        console.log(`   Completed: ${match.completedDate}`);
        console.log(`   Reported: ${match.reportedAt}`);

        // Check if scheduledDate is missing or invalid
        if (!match.scheduledDate || isNaN(new Date(match.scheduledDate).getTime())) {
          console.log(`   ❌ Missing or invalid scheduledDate`);
          
          if (match.completedDate && !isNaN(new Date(match.completedDate).getTime())) {
            console.log(`   🔧 Setting scheduledDate to completedDate`);
            match.scheduledDate = match.completedDate;
            await match.save();
            fixedCount++;
            console.log(`   ✅ Fixed!`);
          } else {
            console.log(`   ⚠️  Cannot fix - no valid date available`);
            errorCount++;
          }
        } else {
          // Check if the dates make sense
          const scheduledTime = new Date(match.scheduledDate).getTime();
          const completedTime = new Date(match.completedDate).getTime();
          const reportedTime = new Date(match.reportedAt).getTime();
          
          // If scheduledDate and completedDate are very close (within 1 hour), 
          // it might mean the match was reported immediately after completion
          const timeDiff = Math.abs(completedTime - scheduledTime);
          const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
          
          if (timeDiff < oneHour) {
            console.log(`   ℹ️  Scheduled and completed dates are very close (${Math.round(timeDiff / (60 * 1000))} minutes apart)`);
            console.log(`   ✅ No fix needed: scheduledDate appears correct`);
            skippedCount++;
          } else {
            console.log(`   ℹ️  Scheduled and completed dates differ by ${Math.round(timeDiff / (60 * 60 * 1000))} hours`);
            console.log(`   ✅ No fix needed: scheduledDate appears correct`);
            skippedCount++;
          }
        }
      } catch (error) {
        console.error(`   ❌ Error processing match:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MATCH DATE FIX SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${fixedCount} matches`);
    console.log(`⏭️  Skipped: ${skippedCount} matches (no fix needed)`);
    console.log(`❌ Errors: ${errorCount} matches`);
    console.log(`📊 Total: ${matches.length} matches reviewed`);

    if (fixedCount > 0) {
      console.log('\n🎉 Successfully fixed match dates!');
      console.log('💡 The ladder app should now display correct match dates.');
      console.log('🔄 You may need to refresh the frontend to see the changes.');
    } else {
      console.log('\n✅ No fixes were needed - all match dates appear to be correct.');
    }

  } catch (error) {
    console.error('❌ Error fixing match dates:', error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
console.log('🚀 Starting match date fix process...');
console.log('='.repeat(60));
fixMatchDates()
  .then(() => {
    console.log('\n✅ Match date fix process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Match date fix process failed:', error);
    process.exit(1);
  });
