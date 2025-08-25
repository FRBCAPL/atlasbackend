import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkPins() {
  try {
    console.log('🔍 Checking user PINs for login issues...');
    
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    const users = await User.find({}).select('firstName lastName email pin isApproved isActive');
    
    console.log(`📊 Found ${users.length} total users in database`);
    console.log('\n=== USER PIN STATUS ===');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   - Has PIN: ${user.pin ? '✅ YES' : '❌ NO'}`);
      console.log(`   - PIN Length: ${user.pin ? user.pin.length : 0}`);
      console.log(`   - Approved: ${user.isApproved ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Active: ${user.isActive ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
    
    // Test PIN comparison for a few users
    console.log('=== TESTING PIN COMPARISON ===');
    
    const testUsers = users.slice(0, 3); // Test first 3 users
    for (const user of testUsers) {
      if (user.pin) {
        try {
          // Test with a common PIN like "1234"
          const testPin = "1234";
          const isMatch = await user.comparePin(testPin);
          console.log(`${user.firstName} ${user.lastName}: Test PIN "1234" = ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        } catch (error) {
          console.log(`${user.firstName} ${user.lastName}: PIN comparison error - ${error.message}`);
        }
      } else {
        console.log(`${user.firstName} ${user.lastName}: ❌ NO PIN SET`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking PINs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

checkPins()
  .then(() => {
    console.log('🎉 PIN check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 PIN check failed:', error);
    process.exit(1);
  });
