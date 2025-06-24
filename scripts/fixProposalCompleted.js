// Script to reset counterProposal.completed to false for all proposals
const mongoose = require('mongoose');
const Proposal = require('../src/models/Proposal');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/YOUR_DB_NAME';

async function fixCompleted() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const result = await Proposal.updateMany(
    { 'counterProposal.completed': { $ne: true } },
    { $set: { 'counterProposal.completed': false } }
  );
  console.log('Proposals updated:', result.nModified || result.modifiedCount);
  await mongoose.disconnect();
}

fixCompleted().catch(err => {
  console.error('Error fixing proposals:', err);
  process.exit(1);
}); 