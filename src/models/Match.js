import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  opponent: String,
  player: String,
  day: String,
  date: String,
  time: String,
  location: String,
  gameType: String,
  raceLength: String,
  divisions: [String],
  createdAt: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false }
});

export default mongoose.model('Match', matchSchema);
