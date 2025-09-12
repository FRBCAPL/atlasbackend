/**
 * Simple script to fix existing match dates in the database
 * Run this from the atlasbackend directory: node fix-match-dates-simple.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple LadderMatch schema for this script
const LadderMatchSchema = new mongoose.Schema({
  challengeId: mongoose.Schema.Types.ObjectId,
  matchType: String,
  player1: mongoose.Schema.Types.ObjectId,
  player2: mongoose.Schema.Types.ObjectId,
  entryFee: Number,
  raceLength: Number,
  gameType: String,
  tableSize: String,
  winner: mongoose.Schema.Types.ObjectId,
  loser: mongoose.Schema.Types.ObjectId,
  score: String,
  player1OldPosition: Number,
  player1NewPosition: Number,
  player2OldPosition: Number,
  player2NewPosition: Number,
  player1Ladder: String,
  player2Ladder: String,
  scheduledDate: Date,
  completedDate: Date,
  venue: String,
  status: String,
  reportedBy: mongoose.Schema.Types.ObjectId,
  reportedAt: Date,
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date,
  notes: String,
  adminNotes: String,
  prizeAmount: Number
}, { timestamps: true });

const LadderMatch = mongoose.model('LadderMatch', LadderMatchSchema);

async function fixMatchDates() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all completed matches (without populating player data)
    const matches = await LadderMatch.find({ status: 'completed' })
      .sort({ completedDate: -1 });

    console.log(`📊 Found ${matches.length} completed matches to review`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const match of matches) {
      try {
        console.log(`\n🔍 Match ID: ${match._id}`);
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
