import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
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

// Index for efficient queries
locationSchema.index({ name: 1 });
locationSchema.index({ isActive: 1 });

// Pre-save middleware to update the updatedAt field
locationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Location = mongoose.model('Location', locationSchema);

export default Location;
