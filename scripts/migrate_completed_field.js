// Migrate 'completed' field in proposals collection
// - If counterProposal.completed is true, set completed: true
// - Otherwise, set completed: false if not already set

import mongoose from 'mongoose';
import Proposal from '../src/models/Proposal.js';
import connectDB from '../database.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateCompletedField() {
  await connectDB();

  // Print a sample document with counterProposal.completed: true (before)
  const sampleTrueBefore = await Proposal.findOne({ 'counterProposal.completed': true });
  console.log('Sample with counterProposal.completed: true (before):', sampleTrueBefore);

  // Print a sample document without counterProposal.completed: true (before)
  const sampleFalseBefore = await Proposal.findOne({ 'counterProposal.completed': { $ne: true } });
  console.log('Sample without counterProposal.completed: true (before):', sampleFalseBefore);

  // 1. Set completed: true where counterProposal.completed is true
  const resultTrue = await Proposal.updateMany(
    { 'counterProposal.completed': true },
    { $set: { completed: true } }
  );
  console.log(`Set completed: true for ${resultTrue.matchedCount || resultTrue.n} matched, ${resultTrue.modifiedCount || resultTrue.nModified} modified.`);

  // 2. Set completed: false where completed does not exist
  const resultFalse = await Proposal.updateMany(
    { completed: { $exists: false } },
    { $set: { completed: false } }
  );
  console.log(`Set completed: false for ${resultFalse.matchedCount || resultFalse.n} matched, ${resultFalse.modifiedCount || resultFalse.nModified} modified.`);

  // Print a sample document with counterProposal.completed: true (after)
  const sampleTrueAfter = await Proposal.findOne({ 'counterProposal.completed': true });
  console.log('Sample with counterProposal.completed: true (after):', sampleTrueAfter);

  // Print a sample document without counterProposal.completed: true (after)
  const sampleFalseAfter = await Proposal.findOne({ 'counterProposal.completed': { $ne: true } });
  console.log('Sample without counterProposal.completed: true (after):', sampleFalseAfter);

  mongoose.connection.close();
}

migrateCompletedField().catch(err => {
  console.error('Migration error:', err);
  mongoose.connection.close();
}); 