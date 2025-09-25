import mongoose from 'mongoose';

const ladderPlayerSchema = new mongoose.Schema({
  // Basic player info
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  pin: {
    type: String,
    required: false
  },
  
  // Ladder info
  ladderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ladder',
    required: true
  },
  ladderName: {
    type: String,
    required: true,
    enum: ['499-under', '500-549', '550-plus']
  },
  position: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Rating and stats
  fargoRate: {
    type: Number,
    required: true,
    min: 0,
    max: 9999
  },
  totalMatches: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  
  // Status and immunity
  isActive: {
    type: Boolean,
    default: true
  },
  immunityUntil: {
    type: Date,
    default: null
  },
  vacationMode: {
    type: Boolean,
    default: false
  },
  vacationUntil: {
    type: Date,
    default: null
  },
  
  // Challenge tracking
  activeChallenges: [{
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderChallenge'
    },
    type: {
      type: String,
      enum: ['challenge', 'ladder-jump', 'smackdown', 'smackback']
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'scheduled', 'completed', 'cancelled']
    }
  }],
  
  // Match history
  recentMatches: [{
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderMatch'
    },
    opponent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderPlayer'
    },
    result: {
      type: String,
      enum: ['win', 'loss']
    },
    matchType: {
      type: String,
      enum: ['challenge', 'ladder-jump', 'smackdown', 'smackback']
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Admin flags
  isAdmin: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: {
    type: String,
    default: null
  },
  suspensionUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
ladderPlayerSchema.index({ email: 1 });
ladderPlayerSchema.index({ ladderId: 1, position: 1 });
ladderPlayerSchema.index({ ladderName: 1, position: 1 });
ladderPlayerSchema.index({ fargoRate: 1 });
ladderPlayerSchema.index({ isActive: 1 });

// Virtual for full name
ladderPlayerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for win percentage
ladderPlayerSchema.virtual('winPercentage').get(function() {
  if (this.totalMatches === 0) return 0;
  return Math.round((this.wins / this.totalMatches) * 100);
});

// Static method to get players by ladder
ladderPlayerSchema.statics.getPlayersByLadder = function(ladderName) {
  return this.find({ 
    ladderName, 
    isActive: true 
  }).sort({ position: 1 });
};

// Static method to get player by email
ladderPlayerSchema.statics.getPlayerByEmail = function(email) {
  return this.findOne({ 
    $or: [
      { email: email.toLowerCase() },
      { 'unifiedAccount.email': email.toLowerCase() }
    ],
    isActive: true 
  });
};

// Static method to get all players across all ladders
ladderPlayerSchema.statics.getAllPlayers = function() {
  return this.find({ isActive: true }).sort({ ladderName: 1, position: 1 });
};

// Static method to check if position is available
ladderPlayerSchema.statics.isPositionAvailable = function(ladderName, position) {
  return this.findOne({ 
    ladderName, 
    position, 
    isActive: true 
  }).then(player => !player);
};

// Method to check if player can be challenged
ladderPlayerSchema.methods.canBeChallenged = function() {
  if (!this.isActive || this.isSuspended) return false;
  if (this.vacationMode && this.vacationUntil > new Date()) return false;
  if (this.immunityUntil && this.immunityUntil > new Date()) return false;
  return true;
};

// Method to check if player can make challenges
ladderPlayerSchema.methods.canMakeChallenges = function() {
  if (!this.isActive || this.isSuspended) return false;
  if (this.vacationMode && this.vacationUntil > new Date()) return false;
  return true;
};

// Method to get eligible challenge targets
ladderPlayerSchema.methods.getEligibleChallengeTargets = function() {
  const maxSpotsAbove = 4; // Can challenge up to 4 spots above
  const minPosition = Math.max(1, this.position - maxSpotsAbove);
  
  return this.constructor.find({
    ladderName: this.ladderName,
    position: { $gte: minPosition, $lt: this.position },
    isActive: true,
    isSuspended: false
  }).sort({ position: -1 });
};

// Method to get eligible smackdown targets
ladderPlayerSchema.methods.getEligibleSmackdownTargets = function() {
  const maxSpotsBelow = 5; // Can challenge up to 5 spots below
  const maxPosition = this.position + maxSpotsBelow;
  
  return this.constructor.find({
    ladderName: this.ladderName,
    position: { $gt: this.position, $lte: maxPosition },
    isActive: true,
    isSuspended: false
  }).sort({ position: 1 });
};

// Method to check if eligible for ladder jump
ladderPlayerSchema.methods.isEligibleForLadderJump = function() {
  return this.ladderName === '499-under' && this.position <= 3;
};

// Method to get eligible ladder jump targets
ladderPlayerSchema.methods.getEligibleLadderJumpTargets = function() {
  if (!this.isEligibleForLadderJump()) return [];
  
  // Get last 4 positions of 500+ ladder
  return this.constructor.find({
    ladderName: { $in: ['500-549', '550-plus'] },
    isActive: true,
    isSuspended: false
  }).sort({ position: -1 }).limit(4);
};

// Method to compare PIN (plain text comparison like User model)
ladderPlayerSchema.methods.comparePin = async function(candidatePin) {
  return this.pin === candidatePin;
};

// Method to set immunity for a specified number of days
ladderPlayerSchema.methods.setImmunity = function(days = 7) {
  this.immunityUntil = new Date();
  this.immunityUntil.setDate(this.immunityUntil.getDate() + days);
  return this.save();
};

// Method to clear immunity
ladderPlayerSchema.methods.clearImmunity = function() {
  this.immunityUntil = null;
  return this.save();
};

// Method to check if player currently has immunity
ladderPlayerSchema.methods.hasImmunity = function() {
  return this.immunityUntil && this.immunityUntil > new Date();
};

// Method to get immunity status info
ladderPlayerSchema.methods.getImmunityInfo = function() {
  if (!this.immunityUntil) {
    return { hasImmunity: false, expiresAt: null, daysRemaining: 0 };
  }
  
  const now = new Date();
  const expiresAt = this.immunityUntil;
  const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  
  return {
    hasImmunity: expiresAt > now,
    expiresAt: expiresAt,
    daysRemaining: Math.max(0, daysRemaining)
  };
};

const LadderPlayer = mongoose.model('LadderPlayer', ladderPlayerSchema);

export default LadderPlayer;
