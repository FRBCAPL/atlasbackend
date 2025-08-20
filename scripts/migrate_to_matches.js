// Migration script to convert completed proposals to matches
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Proposal from '../src/models/Proposal.js';
import Match from '../src/models/Match.js';

dotenv.config();

const log = (message, data = null) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const migrateCompletedProposals = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅ Connected to MongoDB');
    
    // Find all completed proposals
    const completedProposals = await Proposal.find({
      status: 'confirmed',
      completed: true
    });
    
    log(`Found ${completedProposals.length} completed proposals to migrate`);
    
    if (completedProposals.length === 0) {
      log('No completed proposals found. Migration complete.');
      return;
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const proposal of completedProposals) {
      try {
        // Check if match already exists for this proposal
        const existingMatch = await Match.findOne({ proposalId: proposal._id });
        
        if (existingMatch) {
          log(`⚠️ Match already exists for proposal ${proposal._id}, skipping`);
          skippedCount++;
          continue;
        }
        
        // Create new match from proposal
        const match = new Match({
          proposalId: proposal._id,
          player1Id: proposal.senderName,
          player2Id: proposal.receiverName,
          division: proposal.divisions?.[0] || 'Unknown',
          type: proposal.type || (proposal.phase === 'schedule' ? 'schedule' : 'challenge'),
          status: 'completed',
          scheduledDate: proposal.date || proposal.createdAt,
          completedDate: proposal.winnerChangedAt || proposal.updatedAt || proposal.createdAt,
          winner: proposal.winner,
          loser: proposal.winner === proposal.senderName ? proposal.receiverName : proposal.senderName,
          score: proposal.score || 'Unknown',
          location: proposal.location || 'TBD',
          notes: proposal.notes || '',
          createdAt: proposal.createdAt,
          updatedAt: proposal.updatedAt || proposal.createdAt
        });
        
        await match.save();
        migratedCount++;
        
        log(`✅ Migrated proposal ${proposal._id} to match ${match._id}`);
        
      } catch (error) {
        log(`❌ Error migrating proposal ${proposal._id}:`, error.message);
        errorCount++;
      }
    }
    
    // Summary
    log('📊 Migration Summary:');
    log(`  Total proposals found: ${completedProposals.length}`);
    log(`  Successfully migrated: ${migratedCount}`);
    log(`  Skipped (already exists): ${skippedCount}`);
    log(`  Errors: ${errorCount}`);
    
    // Verify migration
    const totalMatches = await Match.countDocuments();
    const completedMatches = await Match.countDocuments({ status: 'completed' });
    
    log('📈 Post-migration stats:');
    log(`  Total matches in database: ${totalMatches}`);
    log(`  Completed matches: ${completedMatches}`);
    
    log('✅ Migration completed successfully!');
    
  } catch (error) {
    log(`❌ Migration failed: ${error.message}`);
  } finally {
    await mongoose.disconnect();
    log('🔌 Disconnected from MongoDB');
  }
};

// Run migration
migrateCompletedProposals();
