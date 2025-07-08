import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Division from '../src/models/Division.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createInitialDivisions() {
  try {
    const divisions = [
      { name: "FRBCAPL TEST", description: "Test division for FRBCAPL" },
      { name: "Singles Test", description: "Test division for Singles" }
    ];

    for (const divisionData of divisions) {
      const existingDivision = await Division.findOne({ name: divisionData.name });
      if (!existingDivision) {
        const division = new Division(divisionData);
        await division.save();
        console.log(`Created division: ${divisionData.name}`);
      } else {
        console.log(`Division already exists: ${divisionData.name}`);
      }
    }

    console.log('Initial divisions setup complete!');
    mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
    mongoose.disconnect();
  }
}

createInitialDivisions(); 