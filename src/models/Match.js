import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  // Core match data
  proposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true
  },
  player1Id: {
    type: String,
    required: true
  },
  player2Id: {
    type: String,
    required: true
  },
  division: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['schedule', 'challenge'],
    required: true
  },
  
  // Status and dates
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date,
    default: null
  },
  
  // Match results (only when completed)
  winner: {
    type: String,
    default: null
  },
  loser: {
    type: String,
    default: null
  },
  score: {
    type: String,
    default: null
  },
  
  // Additional info
  location: {
    type: String,
    default: 'TBD'
  },
  notes: {
    type: String,
    default: ''
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
matchSchema.index({ division: 1, status: 1, scheduledDate: -1 });
matchSchema.index({ player1Id: 1, division: 1 });
matchSchema.index({ player2Id: 1, division: 1 });
matchSchema.index({ proposalId: 1 });

// Virtual for easy access to both players
matchSchema.virtual('players').get(function() {
  return [this.player1Id, this.player2Id];
});

// Method to complete a match
matchSchema.methods.complete = function(winner, score, notes = '') {
  this.status = 'completed';
  this.winner = winner;
  this.loser = this.player1Id === winner ? this.player2Id : this.player1Id;
  this.score = score;
  this.completedDate = new Date();
  this.notes = notes;
  this.updatedAt = new Date();
  return this.save();
};

// Method to cancel a match
matchSchema.methods.cancel = function(reason = '') {
  this.status = 'cancelled';
  this.notes = reason;
  this.updatedAt = new Date();
  return this.save();
};

// Static method to get matches by status
matchSchema.statics.getByStatus = function(division, status) {
  return this.find({ division, status }).sort({ scheduledDate: 1 });
};

// Static method to get player's matches
matchSchema.statics.getPlayerMatches = function(playerId, division) {
  return this.find({
    division,
    $or: [
      { player1Id: playerId },
      { player2Id: playerId }
    ]
  }).sort({ scheduledDate: -1 });
};

const Match = mongoose.model('Match', matchSchema);

export default Match;
