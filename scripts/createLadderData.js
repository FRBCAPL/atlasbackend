import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ladder from '../src/models/Ladder.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createLadderData = async () => {
  try {
    // Check if ladders already exist
    const existingLadders = await Ladder.find();
    console.log(`Found ${existingLadders.length} existing ladders`);

    if (existingLadders.length === 0) {
      // Create the 499-under ladder
      const ladder499 = new Ladder({
        name: '499-under',
        displayName: '499 & Under',
        description: 'Ladder for players with Fargo rate 499 and under',
        minRating: 0,
        maxRating: 499,
        minimumEntryFee: 10,
        minimumRace: 3,
        isActive: true
      });

      await ladder499.save();
      console.log('Created 499-under ladder:', ladder499._id);

      // Create the 500-549 ladder
      const ladder500 = new Ladder({
        name: '500-549',
        displayName: '500-549',
        description: 'Ladder for players with Fargo rate 500-549',
        minRating: 500,
        maxRating: 549,
        minimumEntryFee: 15,
        minimumRace: 5,
        isActive: true
      });

      await ladder500.save();
      console.log('Created 500-549 ladder:', ladder500._id);

      // Create the 550-plus ladder
      const ladder550 = new Ladder({
        name: '550-plus',
        displayName: '550+',
        description: 'Ladder for players with Fargo rate 550 and above',
        minRating: 550,
        maxRating: 850,
        minimumEntryFee: 20,
        minimumRace: 7,
        isActive: true
      });

      await ladder550.save();
      console.log('Created 550-plus ladder:', ladder550._id);

      console.log('All ladders created successfully!');
    } else {
      console.log('Ladders already exist, skipping creation');
      existingLadders.forEach(ladder => {
        console.log(`- ${ladder.name}: ${ladder.displayName}`);
      });
    }

  } catch (error) {
    console.error('Error creating ladder data:', error);
  }
};

const main = async () => {
  await connectDB();
  await createLadderData();
  console.log('Ladder data setup completed');
  process.exit(0);
};

main();
