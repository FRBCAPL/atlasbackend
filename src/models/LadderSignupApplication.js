import mongoose from 'mongoose';

const ladderSignupApplicationSchema = new mongoose.Schema({
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
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  fargoRate: {
    type: Number,
    min: 0,
    max: 850,
    default: null
  },
  experience: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  currentLeague: {
    type: String,
    trim: true,
    default: ''
  },
  currentRanking: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'contacted'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
ladderSignupApplicationSchema.index({ status: 1, submittedAt: -1 });
ladderSignupApplicationSchema.index({ email: 1 });

// Static method to get pending applications
ladderSignupApplicationSchema.statics.getPendingApplications = function() {
  return this.find({ status: 'pending' }).sort({ submittedAt: -1 });
};

// Static method to get all applications
ladderSignupApplicationSchema.statics.getAllApplications = function() {
  return this.find().sort({ submittedAt: -1 });
};

// Instance method to approve application
ladderSignupApplicationSchema.methods.approve = function(reviewedBy, notes = '') {
  this.status = 'approved';
  this.reviewedAt = new Date();
  this.reviewedBy = reviewedBy;
  this.notes = notes;
  return this.save();
};

// Instance method to reject application
ladderSignupApplicationSchema.methods.reject = function(reviewedBy, notes = '') {
  this.status = 'rejected';
  this.reviewedAt = new Date();
  this.reviewedBy = reviewedBy;
  this.notes = notes;
  return this.save();
};

// Instance method to mark as contacted
ladderSignupApplicationSchema.methods.markAsContacted = function(reviewedBy, notes = '') {
  this.status = 'contacted';
  this.reviewedAt = new Date();
  this.reviewedBy = reviewedBy;
  this.notes = notes;
  return this.save();
};

const LadderSignupApplication = mongoose.model('LadderSignupApplication', ladderSignupApplicationSchema);

export default LadderSignupApplication;
