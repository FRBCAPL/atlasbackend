const mongoose = require('mongoose');

const challengeStatsSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  division: { type: String, required: true },
  
  // Match counts
  totalChallengeMatches: { type: Number, default: 0 },
  matchesAsChallenger: { type: Number, default: 0 },
  matchesAsDefender: { type: Number, default: 0 },
  
  // Defense tracking
  requiredDefenses: { type: Number, default: 0 }, // Max 2 required
  voluntaryDefenses: { type: Number, default: 0 },
  
  // Weekly tracking
  challengesByWeek: [{ type: Number }], // Track which weeks player had challenges
  defendedByWeek: [{ type: Number }], // Track which weeks player defended
  
  // Opponent tracking
  challengedOpponents: [{ type: String }], // Track who they've challenged
  lastChallengeWeek: { type: Number, default: 0 },
  
  // Current standings position (for eligibility calculations)
  currentStanding: { type: Number },
  lastStandingUpdate: { type: Date, default: Date.now },
  
  // Status flags
  hasReachedChallengeLimit: { type: Boolean, default: false },
  hasReachedDefenseLimit: { type: Boolean, default: false },
  isEligibleForChallenges: { type: Boolean, default: true },
  isEligibleForDefense: { type: Boolean, default: true },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for efficient queries
challengeStatsSchema.index({ playerName: 1, division: 1 }, { unique: true });
challengeStatsSchema.index({ division: 1, currentStanding: 1 });

// Pre-save middleware to update timestamps
challengeStatsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for remaining challenges allowed
challengeStatsSchema.virtual('remainingChallenges').get(function() {
  return Math.max(0, 4 - this.totalChallengeMatches);
});

// Virtual for remaining defenses allowed
challengeStatsSchema.virtual('remainingDefenses').get(function() {
  return Math.max(0, 2 - this.requiredDefenses);
});

// Virtual for total defenses (required + voluntary)
challengeStatsSchema.virtual('totalDefenses').get(function() {
  return this.requiredDefenses + this.voluntaryDefenses;
});

// Method to check if player can challenge this week
challengeStatsSchema.methods.canChallengeThisWeek = function(week) {
  return !this.challengesByWeek.includes(week) && !this.defendedByWeek.includes(week);
};

// Method to check if player can defend this week
challengeStatsSchema.methods.canDefendThisWeek = function(week) {
  return !this.challengesByWeek.includes(week) && !this.defendedByWeek.includes(week);
};

// Method to check if player can challenge specific opponent
challengeStatsSchema.methods.canChallengeOpponent = function(opponentName) {
  return !this.challengedOpponents.includes(opponentName);
};

// Method to check if player is eligible for rematch against opponent
challengeStatsSchema.methods.canRematchOpponent = function(opponentName, originalChallengeId) {
  // This will be implemented based on match results
  // For now, return false - will be updated when match completion logic is added
  return false;
};

module.exports = mongoose.model('ChallengeStats', challengeStatsSchema); 