import mongoose from 'mongoose';

const ladderMatchSchema = new mongoose.Schema({
  // Match identification
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderChallenge',
    required: true
  },
  matchType: {
    type: String,
    required: true,
    enum: ['challenge', 'ladder-jump', 'smackdown', 'smackback']
  },
  
  // Players
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderPlayer',
    required: true
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderPlayer',
    required: true
  },
  
  // Match details
  entryFee: {
    type: Number,
    required: true
  },
  raceLength: {
    type: Number,
    required: true
  },
  gameType: {
    type: String,
    enum: ['8-ball', '9-ball', '10-ball', 'mixed'],
    required: true
  },
  tableSize: {
    type: String,
    enum: ['7-foot', '9-foot'],
    required: true
  },
  
  // Match result
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderPlayer',
    required: function() {
      return this.status === 'completed';
    }
  },
  loser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderPlayer',
    required: function() {
      return this.status === 'completed';
    }
  },
  score: {
    type: String,
    required: function() {
      return this.status === 'completed';
    }
  },
  
  // Position changes
  player1OldPosition: {
    type: Number,
    required: true
  },
  player1NewPosition: {
    type: Number,
    required: true
  },
  player2OldPosition: {
    type: Number,
    required: true
  },
  player2NewPosition: {
    type: Number,
    required: true
  },
  
  // Ladder information
  player1Ladder: {
    type: String,
    required: true,
    enum: ['499-under', '500-549', '550-plus']
  },
  player2Ladder: {
    type: String,
    required: true,
    enum: ['499-under', '500-549', '550-plus']
  },
  
  // Match scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date,
    required: function() {
      return this.status === 'completed';
    }
  },
  venue: {
    type: String,
    default: 'Legends Brews & Cues'
  },
  
  // Match status
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'forfeited'],
    default: 'scheduled'
  },
  
  // Reporting
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderPlayer',
    required: function() {
      return this.status === 'completed';
    }
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  
  // Admin verification
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderPlayer',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  
  // Notes and comments
  notes: {
    type: String,
    default: null
  },
  adminNotes: {
    type: String,
    default: null
  },
  
  // Cancellation/forfeit details
  cancellation: {
    reason: {
      type: String,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderPlayer',
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  
  // Prize information
  prizeAmount: {
    type: Number,
    required: function() {
      return this.status === 'completed';
    },
    default: 0
  },
  sponsorPrizes: [{
    description: String,
    value: Number,
    providedBy: String
  }]
}, {
  timestamps: true
});

// Indexes
ladderMatchSchema.index({ player1: 1, completedDate: -1 });
ladderMatchSchema.index({ player2: 1, completedDate: -1 });
ladderMatchSchema.index({ winner: 1, completedDate: -1 });
ladderMatchSchema.index({ loser: 1, completedDate: -1 });
ladderMatchSchema.index({ matchType: 1 });
ladderMatchSchema.index({ status: 1 });
ladderMatchSchema.index({ completedDate: -1 });
ladderMatchSchema.index({ challengeId: 1 });

// Virtual for match duration
ladderMatchSchema.virtual('duration').get(function() {
  if (this.completedDate && this.scheduledDate) {
    return this.completedDate - this.scheduledDate;
  }
  return null;
});

// Static method to get matches for a player
ladderMatchSchema.statics.getMatchesForPlayer = function(playerId, limit = 10) {
  return this.find({
    $or: [{ player1: playerId }, { player2: playerId }],
    status: 'completed' // Only show completed matches
  })
  .populate('player1 player2 winner loser', 'firstName lastName email ladderName position')
  .sort({ completedDate: -1 }) // Sort by completed date
  .limit(limit);
};

// Static method to get recent matches
ladderMatchSchema.statics.getRecentMatches = function(limit = 20) {
  return this.find({ status: 'completed' })
  .populate('player1 player2 winner loser', 'firstName lastName email ladderName position')
  .sort({ completedDate: -1 })
  .limit(limit);
};

// Static method to get matches by type
ladderMatchSchema.statics.getMatchesByType = function(matchType, limit = 50) {
  return this.find({ 
    matchType, 
    status: 'completed' 
  })
  .populate('player1 player2 winner loser', 'firstName lastName email ladderName position')
  .sort({ completedDate: -1 })
  .limit(limit);
};

// Static method to get matches by ladder
ladderMatchSchema.statics.getMatchesByLadder = function(ladderName, limit = 50) {
  return this.find({
    $or: [
      { player1Ladder: ladderName },
      { player2Ladder: ladderName }
    ],
    status: 'completed'
  })
  .populate('player1 player2 winner loser', 'firstName lastName email ladderName position')
  .sort({ completedDate: -1 })
  .limit(limit);
};

// Static method to get player statistics
ladderMatchSchema.statics.getPlayerStats = function(playerId) {
  return this.aggregate([
    {
      $match: {
        $or: [{ player1: mongoose.Types.ObjectId(playerId) }, { player2: mongoose.Types.ObjectId(playerId) }],
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalMatches: { $sum: 1 },
        wins: {
          $sum: {
            $cond: [{ $eq: ['$winner', mongoose.Types.ObjectId(playerId)] }, 1, 0]
          }
        },
        losses: {
          $sum: {
            $cond: [{ $eq: ['$loser', mongoose.Types.ObjectId(playerId)] }, 1, 0]
          }
        },
        totalPrizeMoney: {
          $sum: {
            $cond: [{ $eq: ['$winner', mongoose.Types.ObjectId(playerId)] }, '$prizeAmount', 0]
          }
        }
      }
    }
  ]);
};

// Method to get match description
ladderMatchSchema.methods.getDescription = function() {
  const typeDescriptions = {
    'challenge': 'Challenge Match',
    'ladder-jump': 'Ladder Jump',
    'smackdown': 'SmackDown Match',
    'smackback': 'SmackBack Match'
  };
  
  return typeDescriptions[this.matchType] || 'Unknown Match Type';
};

// Method to check if player won
ladderMatchSchema.methods.didPlayerWin = function(playerId) {
  return this.winner.toString() === playerId.toString();
};

// Method to get opponent
ladderMatchSchema.methods.getOpponent = function(playerId) {
  if (this.player1.toString() === playerId.toString()) {
    return this.player2;
  }
  return this.player1;
};

// Method to get position change for player
ladderMatchSchema.methods.getPositionChange = function(playerId) {
  if (this.player1.toString() === playerId.toString()) {
    return this.player1OldPosition - this.player1NewPosition;
  }
  return this.player2OldPosition - this.player2NewPosition;
};

const LadderMatch = mongoose.model('LadderMatch', ladderMatchSchema);

export default LadderMatch;
