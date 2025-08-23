import mongoose from 'mongoose';

const pendingRegistrationSchema = new mongoose.Schema({
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
  
  // Registration Status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'payment_pending'], 
    default: 'pending' 
  },
  
  // Admin Review
  reviewedBy: { type: String }, // Admin who reviewed
  reviewDate: { type: Date },
  reviewNotes: { type: String },
  
  // Payment Status
  hasPaidRegistrationFee: { type: Boolean, default: false },
  paymentDate: { type: Date },
  paymentMethod: { type: String },
  paymentNotes: { type: String },
  
  // Registration metadata
  registrationDate: { type: Date, default: Date.now },
  source: { type: String, default: 'web_form' }, // 'web_form', 'admin_created', etc.
  
  // Notes
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

// Method to approve and convert to User
pendingRegistrationSchema.methods.approve = async function(approvedBy, paymentInfo = {}) {
  const User = mongoose.model('User');
  
  // Create new user
  const user = new User({
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    textNumber: this.textNumber,
    emergencyContactName: this.emergencyContactName,
    emergencyContactPhone: this.emergencyContactPhone,
    preferredContacts: this.preferredContacts,
    availability: this.availability,
    locations: this.locations,
    pin: this.pin,
    division: this.division,
    isApproved: true,
    approvalDate: new Date(),
    approvedBy: approvedBy,
    hasPaidRegistrationFee: paymentInfo.hasPaid || false,
    paymentDate: paymentInfo.paymentDate,
    paymentMethod: paymentInfo.paymentMethod,
    paymentNotes: paymentInfo.paymentNotes,
    notes: this.notes
  });
  
  await user.save();
  
  // Update pending registration status
  this.status = 'approved';
  this.reviewedBy = approvedBy;
  this.reviewDate = new Date();
  this.hasPaidRegistrationFee = paymentInfo.hasPaid || false;
  this.paymentDate = paymentInfo.paymentDate;
  this.paymentMethod = paymentInfo.paymentMethod;
  this.paymentNotes = paymentInfo.paymentNotes;
  
  await this.save();
  
  return user;
};

// Method to reject
pendingRegistrationSchema.methods.reject = async function(rejectedBy, notes = '') {
  this.status = 'rejected';
  this.reviewedBy = rejectedBy;
  this.reviewDate = new Date();
  this.reviewNotes = notes;
  
  await this.save();
};

export default mongoose.models.PendingRegistration || mongoose.model('PendingRegistration', pendingRegistrationSchema);
