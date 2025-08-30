import mongoose from 'mongoose';

const ladderProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UnifiedUser', required: true },
  
  // Ladder Info
  ladderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ladderName: { type: String, required: true, enum: ['499-under', '500-549', '550-plus'] },
  position: { type: Number, required: true, min: 1 },
  
  // Rating & Stats
  fargoRate: { type: Number, required: true, min: 0, max: 9999 },
  totalMatches: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  
  // Status & Immunity
  isActive: { type: Boolean, default: true },
  immunityUntil: { type: Date },
  vacationMode: { type: Boolean, default: false },
  vacationUntil: { type: Date },
  
  // Challenge Tracking
  activeChallenges: [{
    challengeId: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String, enum: ['challenge', 'ladder-jump', 'smackdown', 'smackback'] },
    status: { type: String, enum: ['pending', 'accepted', 'scheduled', 'completed', 'cancelled'] }
  }],
  
  // Match History
  recentMatches: [{ type: Object }]
}, { timestamps: true });

const LadderProfile = mongoose.model('LadderProfile', ladderProfileSchema);

export default LadderProfile;
