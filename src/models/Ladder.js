import mongoose from 'mongoose';

const ladderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['499-under', '500-549', '550-plus']
  },
  displayName: {
    type: String,
    required: true
  },
  minRating: {
    type: Number,
    required: true
  },
  maxRating: {
    type: Number,
    required: true
  },
  minimumEntryFee: {
    type: Number,
    required: true
  },
  minimumRace: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
ladderSchema.index({ name: 1 });
ladderSchema.index({ minRating: 1, maxRating: 1 });

// Static method to get ladder by rating
ladderSchema.statics.getLadderByRating = function(rating) {
  return this.findOne({
    minRating: { $lte: rating },
    maxRating: { $gte: rating },
    isActive: true
  });
};

// Static method to get all active ladders
ladderSchema.statics.getActiveLadders = function() {
  return this.find({ isActive: true }).sort({ minRating: 1 });
};

const Ladder = mongoose.model('Ladder', ladderSchema);

export default Ladder;
