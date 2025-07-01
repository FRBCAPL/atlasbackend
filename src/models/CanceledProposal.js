const mongoose = require('mongoose');

const canceledProposalSchema = new mongoose.Schema({
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
  status: { type: String, default: "canceled" },
  createdAt: { type: Date, default: Date.now },
  phase: { type: String, default: "scheduled" },
  divisions: [{ type: String }],
  counterProposal: {
    date: String,
    time: String,
    location: String,
    note: String,
    from: String,
    createdAt: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false }
  },
  canceledAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CanceledProposal', canceledProposalSchema); 