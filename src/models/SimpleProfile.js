import mongoose from 'mongoose';

const simpleProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UnifiedUser', required: true },
  appType: { type: String, enum: ['league', 'ladder'], required: true },
  availability: { type: Object, default: {} },
  locations: { type: String, default: '' }
}, { timestamps: true });

// Create a compound index to ensure one profile per user per app type
simpleProfileSchema.index({ userId: 1, appType: 1 }, { unique: true });

const SimpleProfile = mongoose.model('SimpleProfile', simpleProfileSchema);

export default SimpleProfile;
