import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ladder from '../src/models/Ladder.js';

dotenv.config();

const initializeLadders = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define the three ladders
    const ladders = [
      {
        name: '499-under',
        displayName: '499 & Under',
        minRating: 0,
        maxRating: 499,
        minimumEntryFee: 25,
        minimumRace: 7,
        description: 'For players with FargoRate of 499 and under'
      },
      {
        name: '500-549',
        displayName: '500-549',
        minRating: 500,
        maxRating: 549,
        minimumEntryFee: 50,
        minimumRace: 9,
        description: 'For players with FargoRate between 500-549'
      },
      {
        name: '550-plus',
        displayName: '550+',
        minRating: 550,
        maxRating: 9999,
        minimumEntryFee: 50,
        minimumRace: 9,
        description: 'For players with FargoRate of 550 and above'
      }
    ];

    // Clear existing ladders
    await Ladder.deleteMany({});
    console.log('Cleared existing ladders');

    // Insert new ladders
    const createdLadders = await Ladder.insertMany(ladders);
    console.log('Created ladders:', createdLadders.map(l => l.displayName));

    console.log('Ladder initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing ladders:', error);
    process.exit(1);
  }
};

initializeLadders();
