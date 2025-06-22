const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  email: String,
  division: String,
  divisions: [String] 
});

// Prevents OverwriteModelError:
module.exports = mongoose.models.User || mongoose.model('User', userSchema, 'users');
