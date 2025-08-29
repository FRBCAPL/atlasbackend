import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const updateMarkSlamPhone = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Updating Mark Slam\'s phone number...\n');

    // Find Mark Slam by email
    const markSlam = await User.findOne({ email: 'frbcapl@gmail.com' });
    
    if (!markSlam) {
      console.log('❌ Mark Slam not found in database');
      process.exit(1);
    }

    console.log('📋 Current Mark Slam data:');
    console.log(`   Name: ${markSlam.firstName} ${markSlam.lastName}`);
    console.log(`   Email: ${markSlam.email}`);
    console.log(`   Current Phone: ${markSlam.phone}`);
    console.log(`   ID: ${markSlam._id}`);
    console.log('');

    // Update the phone number using findByIdAndUpdate to avoid validation issues
    const newPhone = '(555) 123-4567'; // You can change this to whatever you want
    console.log(`🔄 Updating phone to: ${newPhone}`);
    
    const updatedUser = await User.findByIdAndUpdate(
      markSlam._id,
      { 
        phone: newPhone,
        lastProfileUpdate: new Date()
      },
      { new: true, runValidators: false } // Disable validation to avoid preferredContacts issues
    );
    
    if (updatedUser) {
      console.log('✅ Phone number updated successfully!');
      console.log(`   New phone: ${updatedUser.phone}`);
      console.log(`   Last updated: ${updatedUser.lastProfileUpdate}`);
      console.log('');
      console.log('💡 Now try refreshing your admin dashboard to see the updated phone number.');
    } else {
      console.log('❌ Failed to update phone number');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updateMarkSlamPhone();
