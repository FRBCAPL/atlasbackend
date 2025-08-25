import mongoose from 'mongoose';

const leagueSchema = new mongoose.Schema({
  // League Identification
  leagueId: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  }, // e.g., "front-range-pool", "denver-pool-league"
  
  // League Information
  name: { type: String, required: true },
  description: { type: String },
  website: { type: String },
  
  // Database Configuration
  databaseConfig: {
    connectionString: { type: String, required: true },
    databaseName: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  },
  
  // Admin Configuration
  adminEmail: { type: String, required: true },
  adminName: { type: String, required: true },
  adminPhone: { type: String },
  
  // League Settings
  settings: {
    requireApproval: { type: Boolean, default: true },
    allowSelfRegistration: { type: Boolean, default: true },
    registrationFee: { type: Number, default: 0 },
    defaultMatchDuration: { type: Number, default: 60 },
    allowChallenges: { type: Boolean, default: true },
    maxPlayersPerDivision: { type: Number, default: 20 }
  },
  
  // Contact Information
  contactInfo: {
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    socialMedia: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String }
    }
  },
  
  // Subscription/Billing
  subscription: {
    plan: { 
      type: String, 
      enum: ['free', 'basic', 'premium', 'enterprise'], 
      default: 'free' 
    },
    status: { 
      type: String, 
      enum: ['active', 'trial', 'expired', 'cancelled'], 
      default: 'trial' 
    },
    trialEndsAt: { type: Date },
    expiresAt: { type: Date },
    maxPlayers: { type: Number, default: 50 },
    maxDivisions: { type: Number, default: 3 }
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false }, // Can be discovered publicly
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient queries
leagueSchema.index({ leagueId: 1 });
leagueSchema.index({ adminEmail: 1 });
leagueSchema.index({ isActive: 1, isPublic: 1 });
leagueSchema.index({ 'subscription.status': 1 });

// Virtual for full league URL
leagueSchema.virtual('leagueUrl').get(function() {
  return `${process.env.FRONTEND_URL || 'https://frusapl.com'}/league/${this.leagueId}`;
});

// Method to check if league is in trial
leagueSchema.methods.isInTrial = function() {
  return this.subscription.status === 'trial' && 
         this.subscription.trialEndsAt && 
         new Date() < this.subscription.trialEndsAt;
};

// Method to check if league can add more players
leagueSchema.methods.canAddPlayer = function(currentPlayerCount) {
  return currentPlayerCount < this.subscription.maxPlayers;
};

// Method to check if league can add more divisions
leagueSchema.methods.canAddDivision = function(currentDivisionCount) {
  return currentDivisionCount < this.subscription.maxDivisions;
};

export default mongoose.models.League || mongoose.model('League', leagueSchema);
