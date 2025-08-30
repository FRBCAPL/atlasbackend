import mongoose from 'mongoose';

const leagueProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UnifiedUser', required: true },
  
  // League Info
  divisions: [{ type: String }],
  division: { type: String },
  
  // Availability & Locations
  availability: {
    Mon: [{ type: String }],
    Tue: [{ type: String }],
    Wed: [{ type: String }],
    Thu: [{ type: String }],
    Fri: [{ type: String }],
    Sat: [{ type: String }],
    Sun: [{ type: String }]
  },
  locations: { type: String },
  
  // League Stats
  totalMatches: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  
  // Payment Info
  paymentStatus: { type: String, default: 'pending' },
  hasPaidRegistrationFee: { type: Boolean, default: false },
  paymentHistory: [{ type: Object }],
  
  // Penalties
  penalties: [{ type: Object }]
}, { timestamps: true });

const LeagueProfile = mongoose.model('LeagueProfile', leagueProfileSchema);

export default LeagueProfile;
