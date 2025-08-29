import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderSignupApplication from '../src/models/LadderSignupApplication.js';
import LadderPlayer from '../src/models/LadderPlayer.js';
import Ladder from '../src/models/Ladder.js';
import bcrypt from 'bcryptjs';

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

const fixApprovedApplications = async () => {
  try {
    // Find all approved applications
    const approvedApplications = await LadderSignupApplication.find({ status: 'approved' });
    console.log(`Found ${approvedApplications.length} approved applications`);

    for (const application of approvedApplications) {
      console.log(`\nProcessing application for ${application.firstName} ${application.lastName} (${application.email})`);
      
      // Check if player already exists
      const existingPlayer = await LadderPlayer.findOne({ email: application.email });
      if (existingPlayer) {
        console.log(`✅ Player already exists: ${existingPlayer.firstName} ${existingPlayer.lastName} on ${existingPlayer.ladderName} ladder at position ${existingPlayer.position}`);
        continue;
      }

      // Determine ladder based on FargoRate
      let ladderName = '499-under';
      if (application.fargoRate) {
        if (application.fargoRate >= 500 && application.fargoRate <= 549) {
          ladderName = '500-549';
        } else if (application.fargoRate >= 550) {
          ladderName = '550-plus';
        }
      }

      // Get the ladder
      const ladder = await Ladder.findOne({ name: ladderName });
      if (!ladder) {
        console.log(`❌ Ladder ${ladderName} not found, skipping`);
        continue;
      }

      // Find the lowest position in the ladder
      const lowestPosition = await LadderPlayer.findOne({ ladderName })
        .sort({ position: -1 })
        .limit(1);
      
      const newPosition = (lowestPosition?.position || 0) + 1;

      // Generate a random PIN (4 digits)
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const hashedPin = await bcrypt.hash(pin, 10);

      // Create the ladder player
      const newLadderPlayer = new LadderPlayer({
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        pin: hashedPin,
        fargoRate: application.fargoRate || 450,
        ladderId: ladder._id,
        ladderName: ladderName,
        position: newPosition,
        isActive: true,
        stats: {
          wins: 0,
          losses: 0
        }
      });

      await newLadderPlayer.save();
      console.log(`✅ Created player: ${newLadderPlayer.firstName} ${newLadderPlayer.lastName}`);
      console.log(`   - Ladder: ${ladderName}`);
      console.log(`   - Position: ${newPosition}`);
      console.log(`   - PIN: ${pin}`);
      console.log(`   - Email: ${application.email}`);
    }

    console.log('\n🎉 All approved applications processed!');

  } catch (error) {
    console.error('Error fixing approved applications:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixApprovedApplications();
  console.log('Fix completed');
  process.exit(0);
};

main();
