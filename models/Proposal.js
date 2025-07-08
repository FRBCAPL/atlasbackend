import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  senderName: String,
  receiverName: String,
  date: String,
  time: String,
  location: String,
  message: String,
  gameType: String,
  raceLength: Number,
  status: { type: String, default: "pending" },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
proposalSchema.index({ receiverName: 1, status: 1 });
proposalSchema.index({ receiver: 1, status: 1 });

export default mongoose.model('Proposal', proposalSchema);
