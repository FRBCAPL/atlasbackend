import mongoose from 'mongoose';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function resetTestPins() {
  try {
    console.log('🔧 Resetting PINs for test users...');
    
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Find test users (users with test emails or specific test names)
    const testUsers = await User.find({
      $or: [
        { email: { $regex: /test|example|demo/, $options: 'i' } },
        { firstName: { $regex: /test|beta/i } },
        { lastName: { $regex: /test|user/i } }
      ]
    });
    
    console.log(`📊 Found ${testUsers.length} test users`);
    
    if (testUsers.length === 0) {
      console.log('❌ No test users found. Creating some test users...');
      
      // Create a few test users with known PINs
      const testUserData = [
        {
          firstName: 'Test',
          lastName: 'User1',
          email: 'testuser1@example.com',
          phone: '555-0001',
          locations: 'Test Pool Hall',
          pin: '1234',
          isApproved: true,
          isActive: true,
          preferredContacts: ['email']
        },
        {
          firstName: 'Test',
          lastName: 'User2', 
          email: 'testuser2@example.com',
          phone: '555-0002',
          locations: 'Test Pool Hall',
          pin: '5678',
          isApproved: true,
          isActive: true,
          preferredContacts: ['email']
        },
        {
          firstName: 'Beta',
          lastName: 'Tester',
          email: 'betatester@example.com',
          phone: '555-0003',
          locations: 'Test Pool Hall',
          pin: '9999',
          isApproved: true,
          isActive: true,
          preferredContacts: ['email']
        }
      ];
      
      for (const userData of testUserData) {
        const hashedPin = await bcrypt.hash(userData.pin, 10);
        const user = new User({
          ...userData,
          pin: hashedPin,
          availability: {
            Mon: ['6:00 PM - 8:00 PM'],
            Tue: ['6:00 PM - 8:00 PM'],
            Wed: ['6:00 PM - 8:00 PM'],
            Thu: ['6:00 PM - 8:00 PM'],
            Fri: ['6:00 PM - 8:00 PM'],
            Sat: ['6:00 PM - 8:00 PM'],
            Sun: ['6:00 PM - 8:00 PM']
          }
        });
        
        await user.save();
        console.log(`✅ Created test user: ${user.firstName} ${user.lastName} (${user.email}) with PIN: ${userData.pin}`);
      }
      
    } else {
      // Reset PINs for existing test users
      const testPins = ['1234', '5678', '9999', '1111', '2222'];
      
      for (let i = 0; i < testUsers.length; i++) {
        const user = testUsers[i];
        const newPin = testPins[i % testPins.length];
        const hashedPin = await bcrypt.hash(newPin, 10);
        
        // Update only the PIN field to avoid validation issues
        await User.updateOne(
          { _id: user._id },
          { $set: { pin: hashedPin } }
        );
        
        console.log(`✅ Reset PIN for ${user.firstName} ${user.lastName} (${user.email}) to: ${newPin}`);
      }
    }
    
    console.log('\n🎉 Test user PINs have been reset!');
    console.log('\n📋 Test User Login Credentials:');
    console.log('Email: testuser1@example.com | PIN: 1234');
    console.log('Email: testuser2@example.com | PIN: 5678');
    console.log('Email: betatester@example.com | PIN: 9999');
    console.log('\n💡 You can now login with these test users!');
    
  } catch (error) {
    console.error('❌ Error resetting test PINs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

resetTestPins()
  .then(() => {
    console.log('🎉 Test PIN reset completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test PIN reset failed:', error);
    process.exit(1);
  });
