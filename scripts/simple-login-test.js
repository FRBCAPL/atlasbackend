import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const simpleLoginTest = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔍 Simple Login Test with CORRECT emails...\n');

    // Test with the correct emails from the database
    const testCases = [
      { email: 'frbcapl@gmail.com', pin: '777777', name: 'Mark Slam' },
      { email: 'slamproatulive@gmail.com', pin: '2468', name: 'Mark Test' },
      { email: 'randyfishburn@msn.com', pin: '5151', name: 'Randy Fishburn' },
      { email: 'rmeindl99@gmail.com', pin: '7485', name: 'Ryan Meindl' }
    ];

    for (const testCase of testCases) {
      console.log(`\n🔍 Testing ${testCase.name} (${testCase.email}) with PIN ${testCase.pin}:`);
      
      // Step 1: Find user by email
      const user = await User.findOne({ email: testCase.email.toLowerCase() });
      
      if (!user) {
        console.log(`   ❌ User not found by email`);
        continue;
      }
      
      console.log(`   ✅ User found: ${user.firstName} ${user.lastName}`);
      console.log(`   - isApproved: ${user.isApproved}`);
      console.log(`   - isActive: ${user.isActive}`);
      console.log(`   - Has PIN: ${!!user.pin}`);
      
      // Step 2: Test PIN validation
      try {
        const isPinValid = await user.comparePin(testCase.pin);
        console.log(`   - PIN validation: ${isPinValid}`);
        
        if (isPinValid) {
          console.log(`   ✅ LOGIN WOULD SUCCEED for ${testCase.name}`);
        } else {
          console.log(`   ❌ LOGIN WOULD FAIL - Invalid PIN for ${testCase.name}`);
        }
      } catch (error) {
        console.log(`   ❌ PIN validation error: ${error.message}`);
      }
    }

    // Test the actual login logic with PIN
    console.log('\n🔍 Testing Actual Login Logic with PIN...');
    
    const testPin = '2468'; // Mark Test's PIN
    console.log(`Testing login with PIN: ${testPin}`);
    
    // Simulate the login logic from authController
    let user = await User.findOne({ 
      email: { $regex: new RegExp(`^${testPin}$`, 'i') }
    });

    if (!user) {
      console.log('   - Not found by email, checking by PIN...');
      const allUsers = await User.find({});
      
      for (const potentialUser of allUsers) {
        try {
          if (potentialUser.pin && potentialUser.pin.length > 0) {
            const isPinMatch = await potentialUser.comparePin(testPin);
            if (isPinMatch) {
              user = potentialUser;
              console.log(`   - Found user by PIN: ${user.firstName} ${user.lastName}`);
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    if (user) {
      console.log(`   ✅ User found: ${user.firstName} ${user.lastName}`);
      console.log(`   - isApproved: ${user.isApproved}`);
      console.log(`   - isActive: ${user.isActive}`);
      
      if (user.isApproved && user.isActive) {
        console.log(`   ✅ LOGIN WOULD SUCCEED`);
      } else {
        console.log(`   ❌ LOGIN WOULD FAIL - User not approved or active`);
      }
    } else {
      console.log(`   ❌ No user found with PIN: ${testPin}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

simpleLoginTest();
