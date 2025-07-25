import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderEmail: { type: String, required: true },
  receiverEmail: { type: String, required: true },
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: false },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

export default mongoose.model('Message', messageSchema); 