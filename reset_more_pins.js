import mongoose from 'mongoose';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function resetMorePins() {
  try {
    console.log('🔧 Resetting PINs for additional test users...');
    
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Get a few more users to reset PINs for
    const users = await User.find({}).limit(5);
    
    console.log(`📊 Found ${users.length} users to reset PINs for`);
    
    const testPins = ['1111', '2222', '3333', '4444', '5555'];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const newPin = testPins[i];
      const hashedPin = await bcrypt.hash(newPin, 10);
      
      // Update only the PIN field to avoid validation issues
      await User.updateOne(
        { _id: user._id },
        { $set: { pin: hashedPin } }
      );
      
      console.log(`✅ Reset PIN for ${user.firstName} ${user.lastName} (${user.email}) to: ${newPin}`);
    }
    
    console.log('\n🎉 Additional user PINs have been reset!');
    console.log('\n📋 Additional Test User Login Credentials:');
    console.log('You can now login with any of these users using their email or PIN!');
    
  } catch (error) {
    console.error('❌ Error resetting additional PINs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

resetMorePins()
  .then(() => {
    console.log('🎉 Additional PIN reset completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Additional PIN reset failed:', error);
    process.exit(1);
  });
