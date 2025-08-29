import mongoose from 'mongoose';

const prizePoolSchema = new mongoose.Schema({
  // Prize pool period
  period: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'quarterly',
    required: true
  },
  
  // Period identification
  periodStart: {
    type: Date,
    required: true
  },
  
  periodEnd: {
    type: Date,
    required: true
  },
  
  periodName: {
    type: String,
    required: true // e.g., "Q1 2024", "January 2024"
  },
  
  // Financial tracking
  totalCollected: {
    type: Number,
    default: 0,
    required: true
  },
  
  totalDistributed: {
    type: Number,
    default: 0,
    required: true
  },
  
  currentBalance: {
    type: Number,
    default: 0,
    required: true
  },
  
  // Prize categories and amounts
  prizeCategories: [{
    name: {
      type: String,
      required: true // e.g., "Ladder Leader", "Most Improved"
    },
    percentage: {
      type: Number,
      required: true // e.g., 40 for 40%
    },
    amount: {
      type: Number,
      default: 0
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderPlayer'
    },
    winnerName: String,
    distributed: {
      type: Boolean,
      default: false
    },
    distributedAt: Date
  }],
  
  // Match fee contributions
  matchContributions: [{
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderMatch'
    },
    amount: Number,
    date: {
      type: Date,
      default: Date.now
    },
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderPlayer'
    },
    playerName: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'calculating', 'distributed', 'closed'],
    default: 'active'
  },
  
  // Distribution tracking
  distributedAt: Date,
  distributedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Notes and metadata
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
prizePoolSchema.index({ periodStart: 1, periodEnd: 1 });
prizePoolSchema.index({ status: 1 });
prizePoolSchema.index({ periodName: 1 });

// Pre-save middleware
prizePoolSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate current balance
  this.currentBalance = this.totalCollected - this.totalDistributed;
  
  // Calculate prize amounts based on percentages
  if (this.prizeCategories && this.totalCollected > 0) {
    this.prizeCategories.forEach(category => {
      category.amount = (this.totalCollected * category.percentage) / 100;
    });
  }
  
  next();
});

// Static methods
prizePoolSchema.statics.getCurrentPrizePool = function() {
  const now = new Date();
  return this.findOne({
    periodStart: { $lte: now },
    periodEnd: { $gte: now },
    status: 'active'
  });
};

prizePoolSchema.statics.getActivePrizePools = function() {
  return this.find({ status: 'active' }).sort({ periodStart: -1 });
};

prizePoolSchema.statics.getPrizePoolStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalCollected: { $sum: '$totalCollected' },
        totalDistributed: { $sum: '$totalDistributed' },
        activePools: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'active'] },
              1,
              0
            ]
          }
        },
        completedPools: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'distributed'] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

prizePoolSchema.statics.createNewPeriod = function(periodType = 'quarterly') {
  const now = new Date();
  let periodStart, periodEnd, periodName;
  
  if (periodType === 'monthly') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    periodName = `${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  } else if (periodType === 'quarterly') {
    const quarter = Math.floor(now.getMonth() / 3);
    periodStart = new Date(now.getFullYear(), quarter * 3, 1);
    periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    periodName = `Q${quarter + 1} ${now.getFullYear()}`;
  } else if (periodType === 'yearly') {
    periodStart = new Date(now.getFullYear(), 0, 1);
    periodEnd = new Date(now.getFullYear(), 11, 31);
    periodName = `${now.getFullYear()}`;
  }
  
  // Default prize categories
  const defaultCategories = [
    { name: 'Ladder Leader', percentage: 40 },
    { name: 'Most Improved Player', percentage: 30 },
    { name: 'Most Active Player', percentage: 20 },
    { name: 'Runner-up Prizes', percentage: 10 }
  ];
  
  return new this({
    period: periodType,
    periodStart,
    periodEnd,
    periodName,
    prizeCategories: defaultCategories
  });
};

// Instance methods
prizePoolSchema.methods.addMatchContribution = function(matchData) {
  this.matchContributions.push({
    matchId: matchData.matchId,
    amount: matchData.amount,
    playerId: matchData.playerId,
    playerName: matchData.playerName
  });
  
  this.totalCollected += matchData.amount;
  return this.save();
};

prizePoolSchema.methods.calculateWinners = async function() {
  const LadderPlayer = mongoose.model('LadderPlayer');
  const LadderMatch = mongoose.model('LadderMatch');
  
  // Get all players and their stats for this period
  const players = await LadderPlayer.find({ isActive: true });
  const matches = await LadderMatch.find({
    createdAt: { $gte: this.periodStart, $lte: this.periodEnd }
  });
  
  // Calculate ladder leader (highest position)
  const ladderLeader = players.reduce((leader, player) => {
    return (!leader || player.position < leader.position) ? player : leader;
  });
  
  // Calculate most improved (biggest position gain)
  let mostImproved = null;
  let biggestGain = 0;
  
  for (const player of players) {
    // This would need historical position tracking
    // For now, we'll use a simplified calculation
    const matchesPlayed = matches.filter(m => 
      m.winner === player._id || m.loser === player._id
    ).length;
    
    if (matchesPlayed > biggestGain) {
      biggestGain = matchesPlayed;
      mostImproved = player;
    }
  }
  
  // Calculate most active (most matches played)
  const mostActive = players.reduce((active, player) => {
    const playerMatches = matches.filter(m => 
      m.winner === player._id || m.loser === player._id
    ).length;
    const activeMatches = matches.filter(m => 
      m.winner === active._id || m.loser === active._id
    ).length;
    
    return playerMatches > activeMatches ? player : active;
  });
  
  // Update prize categories with winners
  this.prizeCategories.forEach(category => {
    if (category.name === 'Ladder Leader' && ladderLeader) {
      category.winnerId = ladderLeader._id;
      category.winnerName = `${ladderLeader.firstName} ${ladderLeader.lastName}`;
    } else if (category.name === 'Most Improved Player' && mostImproved) {
      category.winnerId = mostImproved._id;
      category.winnerName = `${mostImproved.firstName} ${mostImproved.lastName}`;
    } else if (category.name === 'Most Active Player' && mostActive) {
      category.winnerId = mostActive._id;
      category.winnerName = `${mostActive.firstName} ${mostActive.lastName}`;
    }
  });
  
  this.status = 'calculating';
  return this.save();
};

prizePoolSchema.methods.distributePrizes = function(distributedBy) {
  this.status = 'distributed';
  this.distributedAt = new Date();
  this.distributedBy = distributedBy;
  
  // Mark all categories as distributed
  this.prizeCategories.forEach(category => {
    category.distributed = true;
    category.distributedAt = new Date();
  });
  
  this.totalDistributed = this.totalCollected;
  return this.save();
};

// Virtual for remaining balance
prizePoolSchema.virtual('remainingBalance').get(function() {
  return this.totalCollected - this.totalDistributed;
});

// Virtual for days remaining in period
prizePoolSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const diff = this.periodEnd - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Set virtuals when converting to JSON
prizePoolSchema.set('toJSON', { virtuals: true });
prizePoolSchema.set('toObject', { virtuals: true });

const PrizePool = mongoose.model('PrizePool', prizePoolSchema);

export default PrizePool;
