import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Example usage: node addDivision.js "FRBCAPL TEST"
const divisionName = process.argv[2];

if (!divisionName) {
  console.error('Please provide a division name as an argument.');
  process.exit(1);
}

async function addDivision() {
  try {
    const users = await User.find({});
    for (const user of users) {
      if (!user.divisions) user.divisions = [];
      if (!user.divisions.includes(divisionName)) {
        user.divisions.push(divisionName);
        await user.save();
        console.log(`Added division ${divisionName} to user ${user.email}`);
      }
    }
    console.log('Division added to all users.');
  } catch (err) {
    console.error('Error adding division:', err);
  } finally {
    mongoose.disconnect();
  }
}

addDivision();
