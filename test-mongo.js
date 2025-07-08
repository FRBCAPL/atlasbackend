import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const matchSchema = new mongoose.Schema({
  opponent: String,
  player: String,
  day: String,
  date: String,
  time: String,
  location: String,
  gameType: String,
  raceLength: String,
  createdAt: { type: Date, default: Date.now }
});
const Match = mongoose.model('Match', matchSchema);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB is connected!");
    const match = new Match({
      opponent: "TestOpponent",
      player: "TestPlayer",
      day: "Monday",
      date: "2025-06-04",
      time: "19:00",
      location: "Test Hall",
      gameType: "8-ball",
      raceLength: "5"
    });
    await match.save();
    console.log("Test match saved!");
    process.exit(0);
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
