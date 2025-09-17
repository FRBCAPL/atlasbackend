/**
 * Fix the September match dates
 * Based on what we found in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Use the same LadderMatch model as the backend
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

async function fixSeptemberDates() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find matches on September 6th (these should move to September 7th)
    const sept6Matches = await LadderMatch.find({
      scheduledDate: {
        $gte: new Date('2025-09-06T00:00:00.000Z'),
        $lte: new Date('2025-09-06T23:59:59.999Z')
      }
    });

    // Find matches on September 7th (these should move to September 8th)
    const sept7Matches = await LadderMatch.find({
      scheduledDate: {
        $gte: new Date('2025-09-07T00:00:00.000Z'),
        $lte: new Date('2025-09-07T23:59:59.999Z')
      }
    });

    console.log(`📊 Found ${sept6Matches.length} matches on September 6th`);
    console.log(`📊 Found ${sept7Matches.length} matches on September 7th`);

    let fixedCount = 0;

    // Move September 6th matches to September 7th
    console.log('\n🔧 Moving September 6th matches to September 7th...');
    for (const match of sept6Matches) {
      const newDate = new Date('2025-09-07T12:00:00.000Z');
      await LadderMatch.updateOne(
        { _id: match._id },
        { 
          $set: { 
            scheduledDate: newDate,
            completedDate: newDate
          }
        }
      );
      console.log(`   ✅ Moved match ${match._id} from 9/6 to 9/7`);
      fixedCount++;
    }

    // Move September 7th matches to September 8th
    console.log('\n🔧 Moving September 7th matches to September 8th...');
    for (const match of sept7Matches) {
      const newDate = new Date('2025-09-08T12:00:00.000Z');
      await LadderMatch.updateOne(
        { _id: match._id },
        { 
          $set: { 
            scheduledDate: newDate,
            completedDate: newDate
          }
        }
      );
      console.log(`   ✅ Moved match ${match._id} from 9/7 to 9/8`);
      fixedCount++;
    }

    console.log(`\n🎉 Fixed ${fixedCount} matches!`);
    console.log('💡 Refresh the calendar to see the updated dates.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

console.log('🚀 Fixing September match dates...');
fixSeptemberDates();
