import mongoose from 'mongoose';

const promotionalConfigSchema = new mongoose.Schema({
  // Promotional period configuration
  isPromotionalPeriod: {
    type: Boolean,
    default: true
  },
  
  promotionalStartDate: {
    type: Date,
    default: new Date('2024-01-01') // When the promotion started
  },
  
  promotionalEndDate: {
    type: Date,
    default: new Date('2025-10-31T23:59:59.999Z') // October 31st, 2025
  },
  
  // Promotional pricing
  promotionalPricing: {
    monthlyMembershipFee: {
      type: Number,
      default: 0 // Free during promotional period
    },
    matchFee: {
      type: Number,
      default: 5 // Still $5 per match
    },
    prizePoolContribution: {
      type: Number,
      default: 0 // No prize pool contribution during promotional period
    },
    platformRevenue: {
      type: Number,
      default: 5 // All $5 goes to platform during promotional period
    }
  },
  
  // Post-promotional pricing (after Oct 31, 2025)
  regularPricing: {
    monthlyMembershipFee: {
      type: Number,
      default: 5 // Regular $5 monthly fee
    },
    matchFee: {
      type: Number,
      default: 5 // Still $5 per match
    },
    prizePoolContribution: {
      type: Number,
      default: 3 // $3 to prize pool per match
    },
    platformRevenue: {
      type: Number,
      default: 2 // $2 to platform per match
    }
  },
  
  // Prize pool configuration
  prizePoolStartDate: {
    type: Date,
    default: new Date('2025-11-01T00:00:00.000Z') // Prize pool starts Nov 1, 2025
  },
  
  // Promotional messaging
  promotionalMessage: {
    type: String,
    default: '🎉 FREE Monthly Membership until October 31st, 2025! 🎉'
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
});

// Pre-save middleware
promotionalConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods
promotionalConfigSchema.statics.getCurrentConfig = async function() {
  let config = await this.findOne();
  
  if (!config) {
    // Create default promotional config if none exists
    config = new this({
      isPromotionalPeriod: true,
      promotionalStartDate: new Date('2024-01-01'),
      promotionalEndDate: new Date('2025-10-31T23:59:59.999Z'),
      prizePoolStartDate: new Date('2025-11-01T00:00:00.000Z')
    });
    await config.save();
  }
  
  return config;
};

promotionalConfigSchema.statics.isPromotionalPeriod = async function() {
  const config = await this.getCurrentConfig();
  const now = new Date();
  
  return now >= config.promotionalStartDate && now < config.promotionalEndDate;
};

promotionalConfigSchema.statics.getCurrentPricing = async function() {
  const config = await this.getCurrentConfig();
  const isPromotional = await this.isPromotionalPeriod();
  
  return isPromotional ? config.promotionalPricing : config.regularPricing;
};

promotionalConfigSchema.statics.shouldContributeToPrizePool = async function() {
  const config = await this.getCurrentConfig();
  const now = new Date();
  
  return now >= config.prizePoolStartDate;
};

promotionalConfigSchema.statics.getPromotionalMessage = async function() {
  const config = await this.getCurrentConfig();
  const isPromotional = await this.isPromotionalPeriod();
  
  if (isPromotional) {
    return config.promotionalMessage; // Return just the message without days left
  }
  
  return null;
};

// Instance methods
promotionalConfigSchema.methods.isCurrentlyPromotional = function() {
  const now = new Date();
  return now >= this.promotionalStartDate && now < this.promotionalEndDate;
};

promotionalConfigSchema.methods.getDaysUntilPromotionEnds = function() {
  const now = new Date();
  if (now >= this.promotionalEndDate) return 0;
  
  return Math.ceil((this.promotionalEndDate - now) / (1000 * 60 * 60 * 24));
};

promotionalConfigSchema.methods.getDaysUntilPrizePoolStarts = function() {
  const now = new Date();
  if (now >= this.prizePoolStartDate) return 0;
  
  return Math.ceil((this.prizePoolStartDate - now) / (1000 * 60 * 60 * 24));
};

const PromotionalConfig = mongoose.model('PromotionalConfig', promotionalConfigSchema);

export default PromotionalConfig;
