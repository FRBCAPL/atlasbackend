require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function fixUserIds() {
  try {
    const users = await User.find({ $or: [ { id: { $exists: false } }, { id: null }, { id: '' } ] });
    console.log(`Found ${users.length} users missing id field.`);
    for (const user of users) {
      if (user.email) {
        user.id = user.email;
        await user.save();
        console.log(`Updated user ${user.email} with id.`);
      }
    }
    console.log('Done.');
  } catch (err) {
    console.error('Error fixing user ids:', err);
  } finally {
    mongoose.disconnect();
  }
}

fixUserIds(); 