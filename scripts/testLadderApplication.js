import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderSignupApplication from '../src/models/LadderSignupApplication.js';

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

const createTestApplication = async () => {
  try {
    // Create a test application
    const testApplication = new LadderSignupApplication({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      fargoRate: 450,
      experience: 'intermediate',
      currentLeague: 'APA',
      currentRanking: '6',
      status: 'pending'
    });

    await testApplication.save();
    console.log('Test application created successfully:', testApplication);
    
    // Create another test application
    const testApplication2 = new LadderSignupApplication({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-987-6543',
      fargoRate: 520,
      experience: 'advanced',
      currentLeague: 'BCA',
      currentRanking: '7',
      status: 'pending'
    });

    await testApplication2.save();
    console.log('Second test application created successfully:', testApplication2);
    
  } catch (error) {
    console.error('Error creating test application:', error);
  }
};

const main = async () => {
  await connectDB();
  await createTestApplication();
  console.log('Test completed successfully');
  process.exit(0);
};

main();
