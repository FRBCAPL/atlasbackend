// Direct MongoDB cleanup script
import mongoose from 'mongoose';
import Proposal from '../src/models/Proposal.js';
import ChallengeStats from '../src/models/ChallengeStats.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/poolleague');

const log = (message, data = null) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const cleanupProposals = async () => {
  try {
    log('🧹 Starting direct MongoDB cleanup...');
    
    // Get all proposals
    const proposals = await Proposal.find({});
    log(`Found ${proposals.length} proposals to delete`);
    
    if (proposals.length === 0) {
      log('No proposals found to delete');
      return;
    }
    
    // Delete all proposals
    const deleteResult = await Proposal.deleteMany({});
    log(`Deleted ${deleteResult.deletedCount} proposals`);
    
    // Reset challenge stats for FRBCAPL TEST division
    const statsResult = await ChallengeStats.deleteMany({ division: 'FRBCAPL TEST' });
    log(`Deleted ${statsResult.deletedCount} challenge stats records for FRBCAPL TEST`);
    
    // Verify cleanup
    const remainingProposals = await Proposal.find({});
    log(`Remaining proposals after cleanup: ${remainingProposals.length}`);
    
    const remainingStats = await ChallengeStats.find({ division: 'FRBCAPL TEST' });
    log(`Remaining challenge stats for FRBCAPL TEST: ${remainingStats.length}`);
    
    log('✅ Cleanup completed successfully!');
    
  } catch (error) {
    log(`❌ Error during cleanup: ${error.message}`);
  } finally {
    mongoose.disconnect();
    log('Disconnected from MongoDB');
  }
};

// Run the cleanup
cleanupProposals();
