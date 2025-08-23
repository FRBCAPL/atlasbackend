import mongoose from 'mongoose';

const divisionConfigSchema = new mongoose.Schema({
  divisionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Division',
    required: true,
    unique: true
  },
  divisionName: {
    type: String,
    required: true
  },
  phase1Weeks: {
    type: Number,
    default: 6,
    min: 1,
    max: 20
  },
  currentSession: {
    name: {
      type: String,
      default: 'Current Session'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  // Additional configuration fields can be added here
  maxPlayers: {
    type: Number,
    default: 20
  },
  description: {
    type: String
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

// Ensure only one config per division
divisionConfigSchema.index({ divisionId: 1 }, { unique: true });
divisionConfigSchema.index({ divisionName: 1 });

export default mongoose.models.DivisionConfig || mongoose.model('DivisionConfig', divisionConfigSchema);
