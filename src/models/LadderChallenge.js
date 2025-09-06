import mongoose from 'mongoose';

const ladderChallengeSchema = new mongoose.Schema({
  // Challenge details
  challengeType: {
    type: String,
    required: true,
    enum: ['challenge', 'ladder-jump', 'smackdown', 'smackback']
  },
  
  // Players
  challenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderPlayer',
    required: true
  },
  defender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderPlayer',
    required: true
  },
  
  // Challenge status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'accepted', 'declined', 'scheduled', 'completed', 'cancelled', 'forfeited'],
    default: 'pending'
  },
  
  // Admin-created flag
  isAdminCreated: {
    type: Boolean,
    default: false
  },
  
  // Match details (to be agreed upon)
  matchDetails: {
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
      default: '9-ball'
    },
    tableSize: {
      type: String,
      enum: ['7-foot', '9-foot'],
      default: '9-foot'
    },
    preferredDates: [{
      type: Date
    }],
    agreedDate: {
      type: Date,
      default: null
    }
  },
  
  // Challenge post details
  challengePost: {
    facebookPostId: {
      type: String,
      default: null
    },
    postContent: {
      type: String,
      required: true
    },
    postedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Acceptance details
  acceptance: {
    acceptedAt: {
      type: Date,
      default: null
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderPlayer',
      default: null
    },
    responseContent: {
      type: String,
      default: null
    }
  },
  
  // Scheduling details
  scheduling: {
    scheduledAt: {
      type: Date,
      default: null
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderPlayer',
      default: null
    },
    venue: {
      type: String,
      default: 'Legends Brews & Cues'
    },
    address: {
      type: String,
      default: '2790 Hancock Expwy, Colorado Springs'
    }
  },
  
  // Match result
  matchResult: {
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderPlayer',
      default: null
    },
    loser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderPlayer',
      default: null
    },
    score: {
      type: String,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LadderPlayer',
      default: null
    }
  },
  
  // Position changes (calculated after match)
  positionChanges: {
    challengerOldPosition: {
      type: Number,
      default: null
    },
    challengerNewPosition: {
      type: Number,
      default: null
    },
    defenderOldPosition: {
      type: Number,
      default: null
    },
    defenderNewPosition: {
      type: Number,
      default: null
    }
  },
  
  // Timestamps and deadlines
  deadline: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Admin notes
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
  }
}, {
  timestamps: true
});

// Indexes
ladderChallengeSchema.index({ challenger: 1, status: 1 });
ladderChallengeSchema.index({ defender: 1, status: 1 });
ladderChallengeSchema.index({ status: 1 });
ladderChallengeSchema.index({ challengeType: 1 });
ladderChallengeSchema.index({ deadline: 1 });
ladderChallengeSchema.index({ createdAt: 1 });

// Pre-save middleware to update updatedAt
ladderChallengeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get active challenges for a player
ladderChallengeSchema.statics.getActiveChallengesForPlayer = function(playerId) {
  return this.find({
    $or: [{ challenger: playerId }, { defender: playerId }],
    status: { $in: ['pending', 'accepted', 'scheduled'] }
  }).populate('challenger defender', 'firstName lastName email ladderName position');
};

// Static method to get pending challenges
ladderChallengeSchema.statics.getPendingChallenges = function() {
  return this.find({ status: 'pending' })
    .populate('challenger defender', 'firstName lastName email ladderName position')
    .sort({ createdAt: -1 });
};

// Static method to get challenges by type
ladderChallengeSchema.statics.getChallengesByType = function(type) {
  return this.find({ challengeType: type })
    .populate('challenger defender', 'firstName lastName email ladderName position')
    .sort({ createdAt: -1 });
};

// Method to check if challenge is expired
ladderChallengeSchema.methods.isExpired = function() {
  return new Date() > this.deadline;
};

// Method to check if challenge can be accepted
ladderChallengeSchema.methods.canBeAccepted = function() {
  return this.status === 'pending' && !this.isExpired();
};

// Method to check if challenge can be declined
ladderChallengeSchema.methods.canBeDeclined = function() {
  return this.status === 'pending' && !this.isExpired();
};

// Method to check if challenge can be cancelled
ladderChallengeSchema.methods.canBeCancelled = function() {
  return ['pending', 'accepted'].includes(this.status);
};

// Method to get challenge description
ladderChallengeSchema.methods.getDescription = function() {
  const typeDescriptions = {
    'challenge': 'Challenge Match',
    'ladder-jump': 'Ladder Jump',
    'smackdown': 'SmackDown Match',
    'smackback': 'SmackBack Match'
  };
  
  return typeDescriptions[this.challengeType] || 'Unknown Match Type';
};

// Method to get minimum requirements based on ladder
ladderChallengeSchema.methods.getMinimumRequirements = function() {
  const challengerLadder = this.challenger.ladderName;
  
  if (challengerLadder === '499-under') {
    return {
      entryFee: 25,
      raceLength: 7
    };
  } else {
    return {
      entryFee: 50,
      raceLength: 9
    };
  }
};

const LadderChallenge = mongoose.model('LadderChallenge', ladderChallengeSchema);

export default LadderChallenge;
