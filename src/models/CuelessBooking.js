import mongoose from 'mongoose';

const cuelessBookingSchema = new mongoose.Schema({
  // Customer Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },

  // Event Details
  eventType: {
    type: String,
    required: true,
    enum: ['ladderMatch', 'privateMatch', 'tournament', 'leagueNight', 'other']
  },
  eventDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  eventTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  numberOfMatches: {
    type: String,
    trim: true
  },
  budget: {
    type: String,
    trim: true
  },
  specialRequests: {
    type: String,
    trim: true
  },

  // Player Information
  playerNames: {
    type: String,
    trim: true
  },
  player1: {
    type: String,
    trim: true
  },
  player2: {
    type: String,
    trim: true
  },

  // Tournament Information
  tournamentDirector: {
    type: String,
    trim: true
  },
  assistantDirector: {
    type: String,
    trim: true
  },
  tournamentName: {
    type: String,
    trim: true
  },

  // Team League Information
  teamName: {
    type: String,
    trim: true
  },
  opponentTeamName: {
    type: String,
    trim: true
  },
  leagueName: {
    type: String,
    trim: true
  },
  matchType: {
    type: String,
    trim: true
  },
  format1: {
    type: String,
    trim: true
  },
  format2: {
    type: String,
    trim: true
  },

  // Other Event Information
  eventDescription: {
    type: String,
    trim: true
  },

  // Terms Agreement
  agreeToTerms: {
    type: Boolean,
    required: true,
    default: false
  },

  // Multi-day event flag
  isMultiDay: {
    type: Boolean,
    default: false
  },

  // Venue Contact Information
  venueContactName: {
    type: String,
    trim: true
  },
  venueContactEmail: {
    type: String,
    trim: true
  },
  venueContactPhone: {
    type: String,
    trim: true
  },

  // Camera count for on-location bookings
  numberOfCameras: {
    type: String,
    trim: true
  },

  // Booking Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },

  // Admin Notes
  adminNotes: {
    type: String,
    trim: true
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

// Index for efficient queries
cuelessBookingSchema.index({ email: 1, createdAt: -1 });
cuelessBookingSchema.index({ status: 1 });
cuelessBookingSchema.index({ eventDate: 1 });

// Update the updatedAt field before saving
cuelessBookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const CuelessBooking = mongoose.model('CuelessBooking', cuelessBookingSchema);

export default CuelessBooking;
