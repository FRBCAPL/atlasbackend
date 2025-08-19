import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  senderName: String,
  receiverName: String,
  date: String,
  time: String,
  location: String,
  message: String,
  gameType: String,
  raceLength: Number,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
  phase: { type: String, default: "scheduled" },
  divisions: [{ type: String }],
  completed: { type: Boolean, default: false },
  isCounter: { type: Boolean, default: false },
  counteredBy: { type: String },
  counteredAt: { type: Date },
  winner: { type: String }, // Name or ID of the winner
  winnerChangedBy: { type: String }, // (deprecated, for backward compatibility)
  winnerChangedAt: { type: Date },
  winnerChangedByName: { type: String }, // Name of the user/admin who last changed the winner
  winnerChangedByEmail: { type: String }, // Email of the user/admin who last changed the winner
  
  // Challenge Phase specific fields
  challengeType: { type: String, enum: ['challenger', 'defender'], default: 'challenger' },
  challengeWeek: { type: Number }, // Week number within Phase 2 (7-10)
  isRematch: { type: Boolean, default: false },
  originalChallengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }, // For rematches
  
  // NEW: Enhanced match result tracking for Phase 2
  matchResult: {
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    winner: { type: String }, // Name of the winner
    loser: { type: String }, // Name of the loser
    score: { type: String }, // Optional score/result details
    notes: { type: String }, // Any additional notes about the match
    reportedBy: { type: String }, // Who reported the result
    reportedAt: { type: Date }
  },
  
  // NEW: Rematch tracking
  rematchEligibility: {
    canRematch: { type: Boolean, default: false },
    eligibleForRematch: { type: String }, // Name of player eligible for rematch
    reason: { type: String }, // Why rematch is/isn't eligible
    expiresAt: { type: Date } // When rematch eligibility expires
  },
  
  challengeValidation: {
    isValid: { type: Boolean, default: true },
    errors: [{ type: String }],
    warnings: [{ type: String }]
  },
  
  counterProposal: {
    date: String,
    time: String,
    location: String,
    note: String,
    from: String,
    createdAt: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false }
  }
});

proposalSchema.index({ receiverName: 1, status: 1 });
proposalSchema.index({ senderName: 1, phase: 1, status: 1 });
proposalSchema.index({ receiverName: 1, phase: 1, status: 1 });
proposalSchema.index({ phase: 1, challengeWeek: 1 }); // For weekly limit tracking
// NEW: Indexes for match result tracking
proposalSchema.index({ 'matchResult.completed': 1, 'matchResult.winner': 1 });
proposalSchema.index({ 'rematchEligibility.canRematch': 1, 'rematchEligibility.eligibleForRematch': 1 });

export default mongoose.model('Proposal', proposalSchema);
