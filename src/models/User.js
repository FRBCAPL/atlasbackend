import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  
  // Contact Information
  phone: { type: String, required: true },
  textNumber: { type: String, default: '' },
  
  // Emergency Contact
  emergencyContactName: { type: String, default: '' },
  emergencyContactPhone: { type: String, default: '' },
  
  // Contact Preferences
  preferredContacts: [{ type: String, enum: ['email', 'phone', 'text'] }],
  
  // Availability Schedule (Mon-Sun)
  availability: {
    Mon: [{ type: String }],
    Tue: [{ type: String }],
    Wed: [{ type: String }],
    Thu: [{ type: String }],
    Fri: [{ type: String }],
    Sat: [{ type: String }],
    Sun: [{ type: String }]
  },
  
  // Playing Locations
  locations: { type: String, required: true },
  
  // Authentication
  pin: { type: String, required: true }, // Hashed
  
  // Division Assignment
  division: { type: String, default: '' },
  
  // Approval Status
  isApproved: { type: Boolean, default: false },
  approvalDate: { type: Date },
  approvedBy: { type: String }, // Admin who approved
  
  // Payment Status
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  hasPaidRegistrationFee: { type: Boolean, default: false },
  paymentDate: { type: Date },
  paymentMethod: { type: String },
  paymentNotes: { type: String },
  
  // Payment Tracking
  paymentHistory: [{
    amount: { type: Number, required: true },
    paymentType: { 
      type: String, 
      enum: ['registration_fee', 'weekly_dues', 'participation_fee', 'penalty', 'other'],
      required: true 
    },
    paymentMethod: { 
      type: String, 
      enum: ['cash', 'venmo', 'credit_card', 'check'],
      required: true 
    },
    notes: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    addedBy: { type: String, default: 'admin' },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Penalty Tracking
  penalties: [{
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    strikeLevel: { type: Number, enum: [1, 2, 3], required: true },
    notes: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    addedBy: { type: String, default: 'admin' },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Status and Metadata
  isActive: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },
  registrationDate: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  lastProfileUpdate: { type: Date },
  
  // Account claiming fields
  isPendingApproval: { type: Boolean, default: false },
  claimMessage: { type: String, default: '' },
  ladderPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'LadderPlayer' },
  approvedAt: { type: Date },
  
  // Match Statistics
  totalMatches: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  
  // Notes
  notes: { type: String, default: '' },
  
  // Legacy fields for compatibility
  id: { type: String, unique: true, sparse: true },
  name: { type: String },
  divisions: [{ type: String }],
  preferences: {
    googleCalendarIntegration: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Method to compare PIN (bcrypt comparison for hashed PINs)
userSchema.methods.comparePin = async function(candidatePin) {
  return await bcrypt.compare(candidatePin, this.pin);
};

// Method to get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

// Prevents OverwriteModelError:
export default mongoose.models.User || mongoose.model('User', userSchema, 'users');
