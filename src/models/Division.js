import mongoose from 'mongoose';

const divisionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String // Optional, for future use
});

export default mongoose.model('Division', divisionSchema);
