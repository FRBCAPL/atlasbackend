import mongoose from 'mongoose';

const paymentRecordSchema = new mongoose.Schema({
  playerEmail: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'cashapp', 'venmo', 'credits', 'square', 'other']
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['match_fee', 'membership', 'credits_purchase', 'prize_payout', 'other']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'pending_verification', 'cancelled'],
    default: 'pending'
  },
  requiresVerification: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: String,
    default: null,
    enum: ['admin', 'system', 'square_webhook', null]
  },
  verificationNotes: {
    type: String,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LadderMatch',
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  // External payment processor data
  externalPaymentId: {
    type: String,
    default: null
  },
  externalTransactionId: {
    type: String,
    default: null
  },
  // Metadata
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
paymentRecordSchema.index({ playerEmail: 1, createdAt: -1 });
paymentRecordSchema.index({ status: 1, createdAt: -1 });
paymentRecordSchema.index({ type: 1, status: 1 });
paymentRecordSchema.index({ requiresVerification: 1, status: 1 });

// Virtual for formatted amount
paymentRecordSchema.virtual('formattedAmount').get(function() {
  return `$${this.amount.toFixed(2)}`;
});

// Virtual for payment method display name
paymentRecordSchema.virtual('paymentMethodDisplay').get(function() {
  const displayNames = {
    'credit_card': 'Credit/Debit Card',
    'cashapp': 'CashApp',
    'venmo': 'Venmo',
    'credits': 'Credits',
    'square': 'Square',
    'other': 'Other'
  };
  return displayNames[this.paymentMethod] || this.paymentMethod;
});

// Method to mark as verified
paymentRecordSchema.methods.markAsVerified = function(verifiedBy, notes) {
  this.status = 'completed';
  this.verifiedBy = verifiedBy;
  this.verificationNotes = notes;
  this.verifiedAt = new Date();
  return this.save();
};

// Method to mark as failed
paymentRecordSchema.methods.markAsFailed = function(verifiedBy, notes) {
  this.status = 'failed';
  this.verifiedBy = verifiedBy;
  this.verificationNotes = notes;
  this.verifiedAt = new Date();
  return this.save();
};

// Static method to get payment statistics for a user
paymentRecordSchema.statics.getUserPaymentStats = async function(playerEmail) {
  const stats = await this.aggregate([
    { $match: { playerEmail } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  
  const result = {
    totalPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    totalAmount: 0,
    successRate: 0
  };
  
  stats.forEach(stat => {
    result.totalPayments += stat.count;
    result.totalAmount += stat.totalAmount;
    
    switch (stat._id) {
      case 'completed':
        result.completedPayments = stat.count;
        break;
      case 'failed':
        result.failedPayments = stat.count;
        break;
      case 'pending':
      case 'pending_verification':
        result.pendingPayments = stat.count;
        break;
    }
  });
  
  if (result.totalPayments > 0) {
    result.successRate = result.completedPayments / result.totalPayments;
  }
  
  return result;
};

const PaymentRecord = mongoose.model('PaymentRecord', paymentRecordSchema);

export default PaymentRecord;
