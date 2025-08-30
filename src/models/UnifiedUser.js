import mongoose from 'mongoose';

const unifiedUserSchema = new mongoose.Schema({
  // Core Identity
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  pin: { type: String, required: true },
  
  // Contact Info
  phone: { type: String, trim: true },
  emergencyContactName: { type: String, trim: true },
  emergencyContactPhone: { type: String, trim: true },
  
  // Account Status
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  isPendingApproval: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  isPlatformAdmin: { type: Boolean, default: false },
  
  // Account Management
  role: { type: String, enum: ['player', 'admin', 'super_admin'], default: 'player' },
  permissions: { type: Object, default: {} },
  approvalDate: { type: Date },
  approvedBy: { type: String },
  registrationDate: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  
  // Preferences
  preferredContacts: [{ type: String }],
  preferences: {
    googleCalendarIntegration: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true }
  },
  
  // Metadata
  notes: { type: String },
  claimMessage: { type: String }
}, { timestamps: true });

// Add methods
unifiedUserSchema.methods.comparePin = async function(candidatePin) {
  return this.pin === candidatePin;
};

const UnifiedUser = mongoose.model('UnifiedUser', unifiedUserSchema);

export default UnifiedUser;
