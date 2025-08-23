import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function checkUserData() {
  try {
    console.log('🔍 Checking user data in database...');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Get all users
    const users = await User.find({}).select('firstName lastName email locations isActive');
    
    console.log(`📊 Found ${users.length} total users in database`);
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      console.log('💡 You may need to migrate players from Google Sheets first');
      return;
    }
    
    // Show users with location data
    const usersWithLocations = users.filter(user => user.locations && user.locations.trim());
    const usersWithoutLocations = users.filter(user => !user.locations || !user.locations.trim());
    
    console.log(`📍 Users with location data: ${usersWithLocations.length}`);
    console.log(`❌ Users without location data: ${usersWithoutLocations.length}`);
    
    if (usersWithLocations.length > 0) {
      console.log('\n📋 Users with locations:');
      usersWithLocations.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Locations: ${user.locations}`);
        console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    if (usersWithoutLocations.length > 0) {
      console.log('\n📋 Users without locations:');
      usersWithoutLocations.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
      });
    }
    
    // Check if there are any pending registrations
    try {
      const PendingRegistration = await import('./src/models/PendingRegistration.js');
      const pendingUsers = await PendingRegistration.default.find({}).select('firstName lastName email locations');
      
      console.log(`\n📝 Found ${pendingUsers.length} pending registrations`);
      
      if (pendingUsers.length > 0) {
        const pendingWithLocations = pendingUsers.filter(user => user.locations && user.locations.trim());
        console.log(`📍 Pending users with locations: ${pendingWithLocations.length}`);
        
        if (pendingWithLocations.length > 0) {
          console.log('\n📋 Pending users with locations:');
          pendingWithLocations.forEach((user, index) => {
            console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
            console.log(`   Locations: ${user.locations}`);
            console.log('');
          });
        }
      }
    } catch (error) {
      console.log('No pending registrations found');
    }
    
  } catch (error) {
    console.error('❌ Error checking user data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the check
checkUserData()
  .then(() => {
    console.log('🎉 User data check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 User data check failed:', error);
    process.exit(1);
  });
