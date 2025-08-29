import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';

dotenv.config();

const testPinComparison = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔍 Testing PIN Comparison Directly...\n');

    // Test Randy Fishburn's PIN
    const testPin = '5151';
    const testEmail = 'randyfishburn@msn.com';
    
    console.log(`Testing PIN: ${testPin} for user: ${testEmail}`);
    
    // Find the user
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${user.firstName} ${user.lastName}`);
    console.log(`   Stored PIN hash: ${user.pin}`);
    console.log(`   PIN hash length: ${user.pin.length}`);
    
    // Test direct bcrypt comparison
    console.log('\n🔍 Testing direct bcrypt comparison...');
    const directComparison = await bcrypt.compare(testPin, user.pin);
    console.log(`   Direct bcrypt.compare('${testPin}', hash): ${directComparison}`);
    
    // Test the model's comparePin method
    console.log('\n🔍 Testing model comparePin method...');
    const modelComparison = await user.comparePin(testPin);
    console.log(`   user.comparePin('${testPin}'): ${modelComparison}`);
    
    // Test with different PIN formats
    console.log('\n🔍 Testing different PIN formats...');
    console.log(`   bcrypt.compare('${testPin}', hash): ${await bcrypt.compare(testPin, user.pin)}`);
    console.log(`   bcrypt.compare('${testPin} ', hash): ${await bcrypt.compare(testPin + ' ', user.pin)}`);
    console.log(`   bcrypt.compare(' ${testPin}', hash): ${await bcrypt.compare(' ' + testPin, user.pin)}`);
    console.log(`   bcrypt.compare('${testPin}', hash): ${await bcrypt.compare(testPin, user.pin)}`);
    
    // Test creating a new hash with the same PIN
    console.log('\n🔍 Testing new hash creation...');
    const newHash = await bcrypt.hash(testPin, 10);
    console.log(`   New hash for '${testPin}': ${newHash}`);
    console.log(`   New hash matches stored: ${await bcrypt.compare(testPin, newHash)}`);
    console.log(`   Stored hash matches new: ${await bcrypt.compare(testPin, user.pin)}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testPinComparison();
