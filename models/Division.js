const mongoose = require('mongoose');

const divisionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String // Optional, for future use
});

module.exports = mongoose.model('Division', divisionSchema);
