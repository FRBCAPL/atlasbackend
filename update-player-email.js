import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const updatePlayerEmail = async () => {
  await connectDB();

  try {
    // Find your player account
    const player = await LadderPlayer.findOne({ email: 'sslampro@gmail.com' });
    
    if (!player) {
      console.log('❌ Player account not found');
      return;
    }

    console.log('🔍 Found player account:');
    console.log(`   Name: ${player.firstName} ${player.lastName}`);
    console.log(`   Current Email: ${player.email}`);
    console.log(`   Ladder: ${player.ladderName}`);
    console.log(`   Position: ${player.position}`);

    // Update the email
    player.email = 'frbcapl@gmail.com';
    await player.save();

    console.log('\n✅ Successfully updated player email!');
    console.log(`   New Email: ${player.email}`);
    console.log('\n🎯 Now your admin account and player account use the same email!');

  } catch (error) {
    console.error('❌ Error updating player email:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

updatePlayerEmail();
