import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // Player Information
  playerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  playerName: { 
    type: String, 
    required: true 
  },
  division: { 
    type: String, 
    required: true 
  },
  session: { 
    type: String, 
    required: true 
  },

  // Payment Details
  amount: { 
    type: Number, 
    required: true 
  },
  paymentType: { 
    type: String, 
    enum: [
      'registration_fee',      // $30 registration fee
      'weekly_dues',           // $10 weekly dues
      'participation_fee',     // $100 full session
      'pre_payment',           // Partial pre-payment
      'late_payment_fee',      // $5 late fee
      'no_show_fee',           // $10 no-show fee
      'late_cancellation_fee', // $10 late cancellation fee
      'reschedule_fee',        // $10 reschedule fee
      'penalty_fee',           // Other penalty fees
      'refund'                 // Refunds
    ],
    required: true 
  },
  paymentMethod: { 
    type: String, 
    enum: [
      'cash',
      'venmo', 
      'cashapp',
      'credit_card',
      'debit_card',
      'check',
      'online'
    ],
    required: true 
  },

  // Week Information (for weekly dues)
  weekNumber: { 
    type: Number, 
    min: 1, 
    max: 10 
  },
  dueDate: { 
    type: Date, 
    required: true 
  },
  paymentDate: { 
    type: Date, 
    default: Date.now 
  },

  // Status
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'pending'
  },

  // Bylaw Compliance
  isOnTime: { 
    type: Boolean, 
    default: true 
  },
  isLate: { 
    type: Boolean, 
    default: false 
  },
  lateFeeApplied: { 
    type: Boolean, 
    default: false 
  },

  // Payment Details
  referenceNumber: { 
    type: String 
  },
  location: { 
    type: String 
  },
  notes: { 
    type: String 
  },

  // Admin Information
  recordedBy: { 
    type: String, 
    default: 'admin' 
  },
  verifiedBy: { 
    type: String 
  },
  verificationDate: { 
    type: Date 
  },

  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
paymentSchema.index({ playerId: 1, session: 1, weekNumber: 1 });
paymentSchema.index({ division: 1, session: 1, status: 1 });
paymentSchema.index({ dueDate: 1, status: 1 });
paymentSchema.index({ paymentDate: 1 });

// Virtual for calculating if payment is late
paymentSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid') return false;
  return new Date() > this.dueDate;
});

// Virtual for calculating days overdue
paymentSchema.virtual('daysOverdue').get(function() {
  if (this.status === 'paid') return 0;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = now - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Method to check if payment is compliant with bylaws
paymentSchema.methods.isCompliant = function() {
  // Weekly dues must be paid by 10:00 PM Sunday
  if (this.paymentType === 'weekly_dues') {
    const dueDate = new Date(this.dueDate);
    const paymentDate = new Date(this.paymentDate);
    
    // Check if paid before 10:00 PM Sunday
    const sunday10PM = new Date(dueDate);
    sunday10PM.setHours(22, 0, 0, 0); // 10:00 PM
    
    return paymentDate <= sunday10PM;
  }
  
  return this.status === 'paid';
};

// Static method to get payment summary for a player
paymentSchema.statics.getPlayerSummary = async function(playerId, session) {
  const payments = await this.find({ playerId, session });
  
  const summary = {
    totalPaid: 0,
    totalOwed: 0,
    weeklyDuesPaid: 0,
    weeklyDuesOwed: 0,
    registrationFeePaid: false,
    participationFeePaid: false,
    lateFees: 0,
    penalties: 0,
    isInGoodStanding: true,
    lastPaymentDate: null,
    overduePayments: []
  };

  payments.forEach(payment => {
    if (payment.status === 'paid') {
      summary.totalPaid += payment.amount;
      summary.lastPaymentDate = payment.paymentDate;
      
      if (payment.paymentType === 'weekly_dues') {
        summary.weeklyDuesPaid += payment.amount;
      } else if (payment.paymentType === 'registration_fee') {
        summary.registrationFeePaid = true;
      } else if (payment.paymentType === 'participation_fee') {
        summary.participationFeePaid = true;
      } else if (payment.paymentType === 'late_payment_fee') {
        summary.lateFees += payment.amount;
      } else if (payment.paymentType.includes('_fee')) {
        summary.penalties += payment.amount;
      }
    } else if (payment.status === 'pending' || payment.status === 'overdue') {
      summary.totalOwed += payment.amount;
      
      if (payment.paymentType === 'weekly_dues') {
        summary.weeklyDuesOwed += payment.amount;
      }
      
      if (payment.isOverdue) {
        summary.overduePayments.push(payment);
        summary.isInGoodStanding = false;
      }
    }
  });

  return summary;
};

// Static method to get division payment summary
paymentSchema.statics.getDivisionSummary = async function(division, session) {
  const payments = await this.find({ division, session });
  
  const summary = {
    totalPlayers: 0,
    playersInGoodStanding: 0,
    playersOverdue: 0,
    totalCollected: 0,
    totalOwed: 0,
    weeklyDuesCollected: 0,
    weeklyDuesOwed: 0,
    lateFeesCollected: 0,
    penaltiesCollected: 0
  };

  const playerIds = [...new Set(payments.map(p => p.playerId.toString()))];
  summary.totalPlayers = playerIds.length;

  payments.forEach(payment => {
    if (payment.status === 'paid') {
      summary.totalCollected += payment.amount;
      
      if (payment.paymentType === 'weekly_dues') {
        summary.weeklyDuesCollected += payment.amount;
      } else if (payment.paymentType === 'late_payment_fee') {
        summary.lateFeesCollected += payment.amount;
      } else if (payment.paymentType.includes('_fee')) {
        summary.penaltiesCollected += payment.amount;
      }
    } else if (payment.status === 'pending' || payment.status === 'overdue') {
      summary.totalOwed += payment.amount;
      
      if (payment.paymentType === 'weekly_dues') {
        summary.weeklyDuesOwed += payment.amount;
      }
    }
  });

  // Count players in good standing
  for (const playerId of playerIds) {
    const playerSummary = await this.getPlayerSummary(playerId, session);
    if (playerSummary.isInGoodStanding) {
      summary.playersInGoodStanding++;
    } else {
      summary.playersOverdue++;
    }
  }

  return summary;
};

// Pre-save middleware to update timestamps
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
