import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixUserDivisions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the user by email
    const user = await User.findOne({ email: 'frbcapl@gmail.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', user.firstName, user.lastName);
    console.log('Current divisions:', user.divisions);

    // Add divisions if not present using updateOne to bypass validation
    if (!user.divisions || user.divisions.length === 0) {
      await User.updateOne(
        { email: 'frbcapl@gmail.com' },
        { $set: { divisions: ['FRBCAPL TEST'] } }
      );
      console.log('Added divisions: ["FRBCAPL TEST"]');
    } else {
      console.log('User already has divisions:', user.divisions);
    }

  } catch (error) {
    console.error('Error fixing user divisions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixUserDivisions();
