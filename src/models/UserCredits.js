import mongoose from 'mongoose';

const userCreditsSchema = new mongoose.Schema({
  playerEmail: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPurchased: {
    type: Number,
    default: 0,
    min: 0
  },
  totalUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPurchaseDate: {
    type: Date,
    default: null
  },
  lastUsedDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
userCreditsSchema.index({ playerEmail: 1 });
userCreditsSchema.index({ balance: 1 });

// Virtual for formatted balance
userCreditsSchema.virtual('formattedBalance').get(function() {
  return `$${this.balance.toFixed(2)}`;
});

// Method to check if user has sufficient credits
userCreditsSchema.methods.hasSufficientCredits = function(amount) {
  return this.balance >= amount;
};

// Method to add credits
userCreditsSchema.methods.addCredits = function(amount) {
  this.balance += amount;
  this.totalPurchased += amount;
  this.lastPurchaseDate = new Date();
  return this.save();
};

// Method to use credits
userCreditsSchema.methods.useCredits = function(amount) {
  if (!this.hasSufficientCredits(amount)) {
    throw new Error('Insufficient credits');
  }
  this.balance -= amount;
  this.totalUsed += amount;
  this.lastUsedDate = new Date();
  return this.save();
};

const UserCredits = mongoose.model('UserCredits', userCreditsSchema);

export default UserCredits;
