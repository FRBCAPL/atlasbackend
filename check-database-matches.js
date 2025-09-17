/**
 * Check what matches are actually in the database
 * Using the same connection as the backend
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

async function checkDatabaseMatches() {
  try {
    // Connect to MongoDB using the same connection as backend
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check total count
    const totalCount = await LadderMatch.countDocuments();
    console.log(`📊 Total LadderMatch documents: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n🔍 No LadderMatch documents found.');
      console.log('💡 The admin panel might be getting data from a different source.');
      
      // Check if there are any other collections with match data
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      console.log('\n📋 All collections in database:');
      collections.forEach(col => console.log(`   📁 ${col.name}`));
      
      // Check each collection for any documents
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`   📊 ${collection.name}: ${count} documents`);
      }
      
    } else {
      // Get all matches
      const allMatches = await LadderMatch.find({}).sort({ scheduledDate: -1 });
      console.log(`\n📅 All LadderMatch documents:`);
      
      for (const match of allMatches) {
        const dateStr = match.scheduledDate ? match.scheduledDate.toISOString().split('T')[0] : 'No date';
        const status = match.status || 'Unknown';
        console.log(`   📅 ${dateStr} (${status}) - Match ID: ${match._id}`);
        console.log(`      Player1: ${match.player1} | Player2: ${match.player2}`);
        console.log(`      Ladder1: ${match.player1Ladder} | Ladder2: ${match.player2Ladder}`);
        if (match.completedDate) {
          console.log(`      Completed: ${match.completedDate.toISOString().split('T')[0]}`);
        }
      }
      
      // Check specifically for September 2025 matches
      const septemberMatches = await LadderMatch.find({
        scheduledDate: {
          $gte: new Date('2025-09-01T00:00:00.000Z'),
          $lte: new Date('2025-09-30T23:59:59.999Z')
        }
      });
      
      console.log(`\n📅 September 2025 matches: ${septemberMatches.length}`);
      for (const match of septemberMatches) {
        const dateStr = match.scheduledDate.toISOString().split('T')[0];
        console.log(`   📅 ${dateStr} - ${match.status}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

console.log('🚀 Checking database matches...');
console.log('='.repeat(60));
checkDatabaseMatches()
  .then(() => {
    console.log('\n✅ Database check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database check failed:', error);
    process.exit(1);
  });
