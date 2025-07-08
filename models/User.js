import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  email: String,
  division: String,
  divisions: [String]
});

// Prevents OverwriteModelError:
export default mongoose.models.User || mongoose.model('User', userSchema, 'users');
