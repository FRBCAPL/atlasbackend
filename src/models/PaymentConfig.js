import mongoose from 'mongoose';

const paymentConfigSchema = new mongoose.Schema({
  leagueId: { type: String, required: true, unique: true, default: 'default' },
  
  // League Fee Structure
  registrationFee: { type: Number, default: 30 },
  weeklyDues: { type: Number, default: 10 },
  totalWeeks: { type: Number, default: 10 },
  participationFee: { type: Number, default: 100 }, // Total for full session
  phase1Weeks: { type: Number, default: 6 }, // Number of weeks in Phase 1
  
  // Penalty Structure
  penaltyStructure: {
    strike1: { type: Number, default: 5 },
    strike2: { type: Number, default: 10 },
    strike3: { type: Number, default: 0 } // 0 means removal, not a fine
  },
  
  // Available payment methods
  paymentMethods: {
    venmo: {
      enabled: { type: Boolean, default: true },
      username: { type: String, default: '' },
      displayName: { type: String, default: 'Venmo' },
      instructions: { type: String, default: 'Send payment to @username' }
    },
    cashapp: {
      enabled: { type: Boolean, default: true },
      username: { type: String, default: '' },
      displayName: { type: String, default: 'Cash App' },
      instructions: { type: String, default: 'Send payment to $username' }
    },
    creditCard: {
      enabled: { type: Boolean, default: false },
      processor: { type: String, default: '' }, // 'square', 'stripe', 'paypal'
      paymentLink: { type: String, default: '' },
      squareAppId: { type: String, default: '' },
      squareLocationId: { type: String, default: '' },
      displayName: { type: String, default: 'Credit/Debit Card' },
      instructions: { type: String, default: 'Pay online using the link below' }
    },
    applePay: {
      enabled: { type: Boolean, default: false },
      paymentLink: { type: String, default: '' },
      displayName: { type: String, default: 'Apple Pay' },
      instructions: { type: String, default: 'Pay using Apple Pay' }
    },
    googlePay: {
      enabled: { type: Boolean, default: false },
      paymentLink: { type: String, default: '' },
      displayName: { type: String, default: 'Google Pay' },
      instructions: { type: String, default: 'Pay using Google Pay' }
    },
    cash: {
      enabled: { type: Boolean, default: true },
      displayName: { type: String, default: 'Cash' },
      instructions: { type: String, default: 'Pay in person to league administrator' }
    },
    check: {
      enabled: { type: Boolean, default: false },
      payeeName: { type: String, default: '' },
      mailingAddress: { type: String, default: '' },
      displayName: { type: String, default: 'Check' },
      instructions: { type: String, default: 'Make check payable to [Payee Name]' }
    }
  },
  
  // Additional configuration
  additionalInstructions: { type: String, default: '' },
  contactInfo: {
    adminName: { type: String, default: '' },
    adminEmail: { type: String, default: '' },
    adminPhone: { type: String, default: '' }
  },
  
  // Session configuration
  currentSession: {
    name: { type: String, default: 'Current Session' },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

export default mongoose.models.PaymentConfig || mongoose.model('PaymentConfig', paymentConfigSchema);
