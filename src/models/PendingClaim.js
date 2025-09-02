import mongoose from 'mongoose';

const pendingClaimSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  playerName: {
    type: String,
    required: true,
    trim: true
  },
  ladder: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: Number,
    required: true
  },
  generatedPin: {
    type: String,
    required: true,
    trim: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['square', 'venmo', 'cashapp', 'cash', 'check', 'credit_card', 'apple_pay', 'google_pay']
  },
  amount: {
    type: Number,
    required: true,
    default: 5.00
  },
  status: {
    type: String,
    required: true,
    enum: ['pending_payment', 'payment_verified', 'approved', 'rejected'],
    default: 'pending_payment'
  },
  paymentDetails: {
    transactionId: String,
    paymentDate: Date,
    verifiedBy: String, // admin email who verified
    verificationNotes: String
  },
  claimData: {
    fargoRate: String,
    message: String,
    phone: String
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

// Update timestamp on save
pendingClaimSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
pendingClaimSchema.index({ email: 1, status: 1 });
pendingClaimSchema.index({ ladder: 1, position: 1 });
pendingClaimSchema.index({ status: 1, createdAt: 1 });

const PendingClaim = mongoose.model('PendingClaim', pendingClaimSchema);

export default PendingClaim;
