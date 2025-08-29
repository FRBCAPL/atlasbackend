import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const debugPinIssues = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔍 Debugging PIN Issues...\n');

    // Test specific users and their PINs
    const testUsers = [
      { email: 'frbcapl@gmail.com', expectedPin: '777777', name: 'Mark Slam' },
      { email: 'kristyncristable@gmail.com', expectedPin: '3468', name: 'Mark Test' },
      { email: 'randyfishburn@msn.com', expectedPin: '5151', name: 'Randy Fishburn' },
      { email: 'rmeindl@aol.com', expectedPin: '7485', name: 'Ryan Meindl' }
    ];

    for (const testUser of testUsers) {
      const user = await User.findOne({ email: testUser.email.toLowerCase() });
      
      if (user) {
        console.log(`\n🔍 Testing ${testUser.name} (${testUser.email}):`);
        console.log(`   Expected PIN: ${testUser.expectedPin}`);
        console.log(`   Stored PIN hash: ${user.pin ? user.pin.substring(0, 20) + '...' : 'None'}`);
        console.log(`   Has PIN: ${!!user.pin}`);
        console.log(`   PIN length: ${user.pin ? user.pin.length : 0}`);
        
        // Test PIN comparison
        try {
          const isValidPin = await user.comparePin(testUser.expectedPin);
          console.log(`   PIN validation result: ${isValidPin}`);
          
          if (!isValidPin) {
            console.log(`   ❌ PIN ${testUser.expectedPin} failed for ${testUser.name}`);
          } else {
            console.log(`   ✅ PIN ${testUser.expectedPin} works for ${testUser.name}`);
          }
        } catch (error) {
          console.log(`   ❌ PIN validation error: ${error.message}`);
        }
      } else {
        console.log(`\n❌ User not found: ${testUser.email}`);
      }
    }

    // Check if there's an issue with the User model's comparePin method
    console.log('\n🔍 Checking User model PIN comparison method...');
    
    const testUser = await User.findOne({ email: 'frbcapl@gmail.com' });
    if (testUser) {
      console.log(`   Test user: ${testUser.firstName} ${testUser.lastName}`);
      console.log(`   PIN hash: ${testUser.pin.substring(0, 20)}...`);
      
      // Test the comparePin method directly
      const result = await testUser.comparePin('777777');
      console.log(`   comparePin('777777') result: ${result}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

debugPinIssues();
