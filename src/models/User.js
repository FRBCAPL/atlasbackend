import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  email: String,
  divisions: [String],
  preferences: {
    googleCalendarIntegration: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true }
  }
});

// Prevents OverwriteModelError:
export default mongoose.models.User || mongoose.model('User', userSchema, 'users');
