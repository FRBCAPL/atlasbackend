import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const platformAdminSchema = new mongoose.Schema({
  // Admin Identification
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
  
  // Role & Permissions
  role: { 
    type: String, 
    enum: ['super_admin', 'admin', 'support'], 
    default: 'admin' 
  },
  
  permissions: {
    // League Management
    canCreateLeagues: { type: Boolean, default: false },
    canDeleteLeagues: { type: Boolean, default: false },
    canManageLeagueOperators: { type: Boolean, default: false },
    
    // Platform Management
    canManagePlatformAdmins: { type: Boolean, default: false },
    canViewAllLeagueData: { type: Boolean, default: false },
    canManageBilling: { type: Boolean, default: false },
    
    // System Management
    canManageSystemSettings: { type: Boolean, default: false },
    canViewSystemLogs: { type: Boolean, default: false },
    canManageBackups: { type: Boolean, default: false }
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  
  // Audit Trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
  
  // Additional metadata for special cases (like super admin with multiple emails/names)
  metadata: {
    secondaryEmail: { type: String, lowercase: true, trim: true },
    realLastName: { type: String },
    alias: { type: String },
    notes: { type: String }
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
platformAdminSchema.index({ email: 1 });
platformAdminSchema.index({ role: 1 });
platformAdminSchema.index({ isActive: 1 });

// Password hashing middleware
platformAdminSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 12);
  }
  next();
});

// Password comparison method
platformAdminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// PIN comparison method
platformAdminSchema.methods.comparePin = async function(candidatePin) {
  return bcrypt.compare(candidatePin, this.pin);
};

// Check if admin has specific permission
platformAdminSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Get full name
platformAdminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Check if super admin
platformAdminSchema.virtual('isSuperAdmin').get(function() {
  return this.role === 'super_admin';
});

// Static method to find admin by email (primary or secondary)
platformAdminSchema.statics.findByEmail = async function(email) {
  const normalizedEmail = email.toLowerCase().trim();
  
  // First try to find by primary email
  let admin = await this.findOne({ email: normalizedEmail });
  
  // If not found, check if it's a secondary email for super admin
  if (!admin) {
    admin = await this.findOne({ 
      'metadata.secondaryEmail': normalizedEmail,
      role: 'super_admin'
    });
  }
  
  return admin;
};

// Method to check if email is valid for this admin (primary or secondary)
platformAdminSchema.methods.isValidEmail = function(email) {
  const normalizedEmail = email.toLowerCase().trim();
  return this.email === normalizedEmail || 
         (this.metadata?.secondaryEmail === normalizedEmail);
};

export default mongoose.models.PlatformAdmin || mongoose.model('PlatformAdmin', platformAdminSchema);
