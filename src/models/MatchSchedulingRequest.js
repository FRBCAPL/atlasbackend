import mongoose from 'mongoose';

const matchSchedulingSchema = new mongoose.Schema({
  challengerName: {
    type: String,
    required: true
  },
  challengerEmail: {
    type: String,
    required: true
  },
  challengerPhone: {
    type: String,
    default: ''
  },
  defenderName: {
    type: String,
    required: true
  },
  defenderEmail: {
    type: String,
    required: false,
    default: ''
  },
  defenderPhone: {
    type: String,
    default: ''
  },
  preferredDate: {
    type: Date,
    required: true
  },
  preferredTime: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  matchType: {
    type: String,
    enum: ['challenge', 'smackdown', 'smackback'],
    default: 'challenge'
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'completed'],
    default: 'pending_approval'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  adminNotes: {
    type: String,
    default: ''
  }
});

// Create the model
const MatchSchedulingRequest = mongoose.model('MatchSchedulingRequest', matchSchedulingSchema);

export default MatchSchedulingRequest;
