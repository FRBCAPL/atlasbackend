import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const membershipSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderPlayer',
    required: true,
    unique: true
  },
  
  tier: {
    type: String,
    enum: ['basic', 'premium'],
    default: 'basic',
    required: true
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired'],
    default: 'inactive'
  },
  
  // Payment tracking
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  
  // Billing cycle
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  
  amount: {
    type: Number,
    required: true,
    default: 5.00 // Basic membership price
  },
  
  // Promotional period tracking
  isPromotionalMembership: {
    type: Boolean,
    default: false
  },
  
  promotionalPeriodEnds: {
    type: Date,
    default: new Date('2025-10-01T00:00:00.000Z')
  },
  
  // Dates
  startDate: {
    type: Date,
    default: Date.now
  },
  
  nextBillingDate: {
    type: Date,
    required: true
  },
  
  endDate: Date,
  
  // Payment history
  payments: [{
    amount: Number,
    date: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded']
    },
    stripePaymentId: String,
    description: String
  }],
  
  // Features access
  features: {
    basicChallenges: { type: Boolean, default: true },
    premiumChallenges: { type: Boolean, default: false },
    advancedStats: { type: Boolean, default: false },
    priorityMatching: { type: Boolean, default: false },
    exclusiveTournaments: { type: Boolean, default: false },
    customProfile: { type: Boolean, default: false }
  },
  
  // Trial information
  trialEndsAt: Date,
  isTrialActive: {
    type: Boolean,
    default: false
  },
  
  // Cancellation
  cancelledAt: Date,
  cancellationReason: String,
  
  // Metadata
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
membershipSchema.index({ playerId: 1 });
membershipSchema.index({ status: 1 });
membershipSchema.index({ nextBillingDate: 1 });
membershipSchema.index({ stripeCustomerId: 1 });

// Pre-save middleware
membershipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set features based on tier
  if (this.tier === 'basic') {
    this.features = {
      basicChallenges: true,
      premiumChallenges: false,
      advancedStats: false,
      priorityMatching: false,
      exclusiveTournaments: false,
      customProfile: false
    };
    this.amount = 5.00;
  } else if (this.tier === 'premium') {
    this.features = {
      basicChallenges: true,
      premiumChallenges: true,
      advancedStats: true,
      priorityMatching: true,
      exclusiveTournaments: true,
      customProfile: true
    };
    this.amount = 10.00;
  }
  
  next();
});

// Static methods
membershipSchema.statics.findActiveMemberships = function() {
  return this.find({ 
    status: 'active',
    $or: [
      { nextBillingDate: { $gt: new Date() } },
      { isTrialActive: true, trialEndsAt: { $gt: new Date() } },
      { isPromotionalMembership: true, promotionalPeriodEnds: { $gt: new Date() } }
    ]
  }).populate('playerId');
};

membershipSchema.statics.createPromotionalMembership = async function(playerId, tier = 'basic') {
  const PromotionalConfig = (await import('./PromotionalConfig.js')).default;
  const config = await PromotionalConfig.getCurrentConfig();
  
  const membership = new this({
    playerId,
    tier,
    status: 'active',
    amount: 0, // Free during promotional period
    isPromotionalMembership: true,
    promotionalPeriodEnds: config.promotionalEndDate,
    nextBillingDate: config.promotionalEndDate, // Will need to pay when promotion ends
    startDate: new Date()
  });
  
  return membership;
};

membershipSchema.statics.findExpiringMemberships = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    nextBillingDate: { $lte: futureDate }
  }).populate('playerId');
};

membershipSchema.statics.getMembershipStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$tier',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$amount' },
        activeCount: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'active'] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// Instance methods
membershipSchema.methods.isActive = function() {
  if (this.status !== 'active') return false;
  
  // Check if trial is still active
  if (this.isTrialActive && this.trialEndsAt && this.trialEndsAt > new Date()) {
    return true;
  }
  
  // Check if billing is current
  return this.nextBillingDate > new Date();
};

membershipSchema.methods.canAccessFeature = function(featureName) {
  if (!this.isActive()) return false;
  return this.features[featureName] || false;
};

membershipSchema.methods.startTrial = function(days = 30) {
  this.isTrialActive = true;
  this.trialEndsAt = new Date();
  this.trialEndsAt.setDate(this.trialEndsAt.getDate() + days);
  this.status = 'active';
  return this.save();
};

membershipSchema.methods.cancelMembership = function(reason = '') {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

membershipSchema.methods.renewMembership = function() {
  this.nextBillingDate = new Date();
  this.nextBillingDate.setMonth(this.nextBillingDate.getMonth() + 1);
  this.status = 'active';
  return this.save();
};

membershipSchema.methods.addPayment = function(paymentData) {
  this.payments.push({
    amount: paymentData.amount,
    date: new Date(),
    status: paymentData.status || 'completed',
    stripePaymentId: paymentData.stripePaymentId,
    description: paymentData.description
  });
  return this.save();
};

membershipSchema.methods.isPromotionalActive = function() {
  if (!this.isPromotionalMembership) return false;
  return new Date() < this.promotionalPeriodEnds;
};

membershipSchema.methods.getEffectiveAmount = async function() {
  if (this.isPromotionalActive()) {
    return 0; // Free during promotional period
  }
  return this.amount;
};

membershipSchema.methods.getDaysUntilPromotionEnds = function() {
  if (!this.isPromotionalMembership) return 0;
  const now = new Date();
  if (now >= this.promotionalPeriodEnds) return 0;
  return Math.ceil((this.promotionalPeriodEnds - now) / (1000 * 60 * 60 * 24));
};

// Virtual for membership duration
membershipSchema.virtual('duration').get(function() {
  if (!this.startDate) return 0;
  const end = this.endDate || new Date();
  return Math.floor((end - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for days until next billing
membershipSchema.virtual('daysUntilBilling').get(function() {
  if (!this.nextBillingDate) return 0;
  const now = new Date();
  const diff = this.nextBillingDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Set virtuals when converting to JSON
membershipSchema.set('toJSON', { virtuals: true });
membershipSchema.set('toObject', { virtuals: true });

const Membership = mongoose.model('Membership', membershipSchema);

export default Membership;
