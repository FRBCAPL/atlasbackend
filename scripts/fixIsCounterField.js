import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Proposal from '../src/models/Proposal.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pool-league', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixIsCounterField() {
  try {
    console.log('Starting migration to fix isCounter field...');
    
    // Find all proposals that have status 'countered' but don't have isCounter set to true
    const proposalsToUpdate = await Proposal.find({
      status: 'countered',
      $or: [
        { isCounter: { $exists: false } },
        { isCounter: false }
      ]
    });
    
    console.log(`Found ${proposalsToUpdate.length} proposals to update`);
    
    if (proposalsToUpdate.length === 0) {
      console.log('No proposals need updating');
      return;
    }
    
    // Update each proposal
    for (const proposal of proposalsToUpdate) {
      console.log(`Updating proposal ${proposal._id} (${proposal.senderName} -> ${proposal.receiverName})`);
      
      await Proposal.findByIdAndUpdate(proposal._id, {
        isCounter: true,
        counteredBy: proposal.counterProposal?.from || proposal.receiverName,
        counteredAt: proposal.counterProposal?.createdAt || proposal.createdAt
      });
    }
    
    console.log('Migration completed successfully!');
    
    // Verify the changes
    const updatedProposals = await Proposal.find({ status: 'countered' });
    console.log(`Total countered proposals: ${updatedProposals.length}`);
    
    const withIsCounter = updatedProposals.filter(p => p.isCounter === true);
    console.log(`Proposals with isCounter=true: ${withIsCounter.length}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the migration
fixIsCounterField(); 