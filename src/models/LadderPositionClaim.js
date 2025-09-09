import mongoose from 'mongoose';

const ladderPositionClaimSchema = new mongoose.Schema({
  // Ladder position being claimed
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
  playerName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Claimer information
  claimerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  claimerName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Claim status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  
  // Claim details
  claimData: {
    fargoRate: String,
    phone: String,
    message: String
  },
  
  // Admin approval
  approvedBy: {
    type: String, // admin email
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
ladderPositionClaimSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for efficient queries
ladderPositionClaimSchema.index({ ladderName: 1, position: 1, status: 1 });
ladderPositionClaimSchema.index({ claimerEmail: 1, status: 1 });
ladderPositionClaimSchema.index({ playerName: 1, status: 1 });

// Static methods
ladderPositionClaimSchema.statics.findActiveClaim = function(ladderName, position) {
  return this.findOne({
    ladderName,
    position,
    status: { $in: ['pending', 'approved'] }
  });
};

ladderPositionClaimSchema.statics.findClaimerClaims = function(email) {
  return this.find({
    claimerEmail: email,
    status: { $in: ['pending', 'approved'] }
  });
};

ladderPositionClaimSchema.statics.findPlayerClaims = function(playerName) {
  return this.find({
    playerName,
    status: { $in: ['pending', 'approved'] }
  });
};

const LadderPositionClaim = mongoose.model('LadderPositionClaim', ladderPositionClaimSchema);

export default LadderPositionClaim;
