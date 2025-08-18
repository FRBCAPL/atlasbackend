import mongoose from 'mongoose';

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
  
  // NEW: Track how many times this player has been challenged
  timesChallenged: { type: Number, default: 0 },
  
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

// UPDATED: Dynamic remaining challenges based on times challenged
// Bylaw: Times Challenged → Challenges You May Issue
// 0 times challenged = 4 challenges allowed
// 1 time challenged = 3 challenges allowed  
// 2 times challenged = 2 challenges allowed
challengeStatsSchema.virtual('remainingChallenges').get(function() {
  // Calculate base challenges allowed based on times challenged
  let baseChallengesAllowed;
  if (this.timesChallenged === 0) {
    baseChallengesAllowed = 4;
  } else if (this.timesChallenged === 1) {
    baseChallengesAllowed = 3;
  } else if (this.timesChallenged >= 2) {
    baseChallengesAllowed = 2;
  } else {
    baseChallengesAllowed = 4; // Fallback
  }
  
  // Subtract challenges already issued
  const challengesIssued = this.matchesAsChallenger;
  return Math.max(0, baseChallengesAllowed - challengesIssued);
});

// Virtual for remaining defenses allowed
challengeStatsSchema.virtual('remainingDefenses').get(function() {
  return Math.max(0, 2 - this.requiredDefenses);
});

// Virtual for total defenses (required + voluntary)
challengeStatsSchema.virtual('totalDefenses').get(function() {
  return this.requiredDefenses + this.voluntaryDefenses;
});

// NEW: Virtual for base challenges allowed (before subtracting issued)
challengeStatsSchema.virtual('baseChallengesAllowed').get(function() {
  if (this.timesChallenged === 0) {
    return 4;
  } else if (this.timesChallenged === 1) {
    return 3;
  } else if (this.timesChallenged >= 2) {
    return 2;
  } else {
    return 4; // Fallback
  }
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

// NEW: Method to increment times challenged
challengeStatsSchema.methods.incrementTimesChallenged = function() {
  this.timesChallenged += 1;
  return this.save();
};

// NEW: Method to get challenge limit breakdown
challengeStatsSchema.methods.getChallengeLimitBreakdown = function() {
  return {
    timesChallenged: this.timesChallenged,
    baseChallengesAllowed: this.baseChallengesAllowed,
    challengesIssued: this.matchesAsChallenger,
    remainingChallenges: this.remainingChallenges,
    explanation: `You have been challenged ${this.timesChallenged} time${this.timesChallenged !== 1 ? 's' : ''}, so you can issue ${this.baseChallengesAllowed} challenges. You have issued ${this.matchesAsChallenger} challenges, leaving ${this.remainingChallenges} remaining.`
  };
};

export default mongoose.model('ChallengeStats', challengeStatsSchema); 