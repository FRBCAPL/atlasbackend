/**
 * Fix date offset issue - add 1 day to scheduledDate for matches that are off by one day
 * Run this from the atlasbackend directory: node fix-date-offset.js
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
  scheduledDate: Date,
  completedDate: Date,
  reportedAt: Date,
  status: String
}, { timestamps: true });

const LadderMatch = mongoose.model('LadderMatch', LadderMatchSchema);

async function fixDateOffset() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all completed matches
    const matches = await LadderMatch.find({ status: 'completed' })
      .sort({ completedDate: -1 });

    console.log(`📊 Found ${matches.length} completed matches to review`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const match of matches) {
      console.log(`\n🔍 Match ID: ${match._id}`);
      
      if (match.scheduledDate) {
        const originalDate = new Date(match.scheduledDate);
        const mountainDate = originalDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' });
        
        console.log(`   Current scheduledDate: ${mountainDate}`);
        console.log(`   Current scheduledDate (raw): ${match.scheduledDate}`);
        
        // Add 1 day to the scheduledDate
        const newDate = new Date(originalDate);
        newDate.setDate(newDate.getDate() + 1);
        
        const newMountainDate = newDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' });
        console.log(`   New scheduledDate: ${newMountainDate}`);
        console.log(`   New scheduledDate (raw): ${newDate}`);
        
        // Update the match
        match.scheduledDate = newDate;
        await match.save();
        
        console.log(`   ✅ Updated!`);
        fixedCount++;
      } else {
        console.log(`   ⚠️  No scheduledDate to fix`);
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 DATE OFFSET FIX SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${fixedCount} matches`);
    console.log(`⏭️  Skipped: ${skippedCount} matches`);
    console.log(`📊 Total: ${matches.length} matches`);

    if (fixedCount > 0) {
      console.log('\n🎉 Successfully fixed date offsets!');
      console.log('💡 All match dates have been moved forward by 1 day.');
      console.log('🔄 You may need to refresh the frontend to see the changes.');
    } else {
      console.log('\n✅ No fixes were needed.');
    }

  } catch (error) {
    console.error('❌ Error fixing date offsets:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
console.log('🚀 Starting date offset fix...');
console.log('⚠️  This will add 1 day to all scheduledDate values');
console.log('='.repeat(60));
fixDateOffset();
