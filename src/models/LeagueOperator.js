import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const leagueOperatorSchema = new mongoose.Schema({
  // Operator Identification
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // Personal Information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String },
  
  // Authentication
  password: { type: String, required: true },
  pin: { type: String }, // Alternative login method
  
  // League Assignment
  assignedLeagues: [{
    leagueId: { type: String, required: true },
    leagueName: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
    permissions: {
      canManagePlayers: { type: Boolean, default: true },
      canManageMatches: { type: Boolean, default: true },
      canManageDivisions: { type: Boolean, default: true },
      canViewReports: { type: Boolean, default: true },
      canManageSettings: { type: Boolean, default: false },
      canManageBilling: { type: Boolean, default: false }
    }
  }],
  
  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  
  // Audit Trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
leagueOperatorSchema.index({ email: 1 });
leagueOperatorSchema.index({ 'assignedLeagues.leagueId': 1 });
leagueOperatorSchema.index({ isActive: 1 });

// Password hashing middleware
leagueOperatorSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 12);
  }
  next();
});

// Password comparison method
leagueOperatorSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// PIN comparison method
leagueOperatorSchema.methods.comparePin = async function(candidatePin) {
  return bcrypt.compare(candidatePin, this.pin);
};

// Check if operator has access to specific league
leagueOperatorSchema.methods.hasLeagueAccess = function(leagueId) {
  return this.assignedLeagues.some(league => 
    league.leagueId === leagueId && this.isActive
  );
};

// Check if operator has specific permission for a league
leagueOperatorSchema.methods.hasLeaguePermission = function(leagueId, permission) {
  const league = this.assignedLeagues.find(l => l.leagueId === leagueId);
  return league && league.permissions[permission] === true;
};

// Get leagues this operator can access
leagueOperatorSchema.methods.getAccessibleLeagues = function() {
  return this.assignedLeagues.map(league => ({
    leagueId: league.leagueId,
    leagueName: league.leagueName,
    permissions: league.permissions
  }));
};

// Get full name
leagueOperatorSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.models.LeagueOperator || mongoose.model('LeagueOperator', leagueOperatorSchema);
