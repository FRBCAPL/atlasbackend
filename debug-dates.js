/**
 * Debug script to check what's happening with dates
 * Run this from the atlasbackend directory: node debug-dates.js
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

async function debugDates() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all completed matches
    const matches = await LadderMatch.find({ status: 'completed' })
      .sort({ completedDate: -1 });

    console.log(`📊 Found ${matches.length} completed matches to debug`);

    for (const match of matches) {
      console.log(`\n🔍 Match ID: ${match._id}`);
      console.log('='.repeat(50));
      
      // Raw dates from database
      console.log('📅 RAW DATES FROM DATABASE:');
      console.log(`   scheduledDate (raw): ${match.scheduledDate}`);
      console.log(`   completedDate (raw): ${match.completedDate}`);
      console.log(`   reportedAt (raw): ${match.reportedAt}`);
      
      // Convert to different formats
      console.log('\n🕐 DATE CONVERSIONS:');
      
      if (match.scheduledDate) {
        const scheduled = new Date(match.scheduledDate);
        console.log(`   scheduledDate UTC: ${scheduled.toISOString()}`);
        console.log(`   scheduledDate Local: ${scheduled.toString()}`);
        console.log(`   scheduledDate Mountain: ${scheduled.toLocaleString('en-US', { timeZone: 'America/Denver' })}`);
        console.log(`   scheduledDate Mountain (date only): ${scheduled.toLocaleDateString('en-US', { timeZone: 'America/Denver' })}`);
      }
      
      if (match.completedDate) {
        const completed = new Date(match.completedDate);
        console.log(`   completedDate UTC: ${completed.toISOString()}`);
        console.log(`   completedDate Local: ${completed.toString()}`);
        console.log(`   completedDate Mountain: ${completed.toLocaleString('en-US', { timeZone: 'America/Denver' })}`);
        console.log(`   completedDate Mountain (date only): ${completed.toLocaleDateString('en-US', { timeZone: 'America/Denver' })}`);
      }
      
      // Test the frontend utility function
      console.log('\n🎯 FRONTEND UTILITY TEST:');
      function formatDateForMountainTime(dateString) {
        if (!dateString) return 'N/A';
        
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return 'Invalid Date';
          
          return date.toLocaleDateString('en-US', {
            timeZone: 'America/Denver',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
        } catch (error) {
          return 'Error';
        }
      }
      
      if (match.scheduledDate) {
        console.log(`   Frontend utility result: ${formatDateForMountainTime(match.scheduledDate)}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the debug
console.log('🚀 Debugging dates...');
debugDates();
