import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function cleanupEmptyUsers() {
  try {
    console.log('🧹 Cleaning up users with empty names...');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Find users with empty names and no email
    const emptyUsers = await User.find({
      $or: [
        { firstName: { $exists: false } },
        { firstName: null },
        { firstName: '' },
        { firstName: { $regex: /^\s*$/ } },
        { lastName: { $exists: false } },
        { lastName: null },
        { lastName: '' },
        { lastName: { $regex: /^\s*$/ } }
      ],
      $or: [
        { email: { $exists: false } },
        { email: null },
        { email: '' },
        { email: { $regex: /^\s*$/ } }
      ]
    }).select('firstName lastName email _id');
    
    console.log(`📊 Found ${emptyUsers.length} users with empty names and no email`);
    
    if (emptyUsers.length === 0) {
      console.log('✅ No empty users to clean up!');
      return;
    }
    
    console.log('\n📋 Users to be deleted:');
    emptyUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Email: "${user.email || 'EMPTY'}"`);
      console.log(`   First Name: "${user.firstName || 'EMPTY'}"`);
      console.log(`   Last Name: "${user.lastName || 'EMPTY'}"`);
    });
    
    // Delete the empty users
    const deleteResult = await User.deleteMany({
      $or: [
        { firstName: { $exists: false } },
        { firstName: null },
        { firstName: '' },
        { firstName: { $regex: /^\s*$/ } },
        { lastName: { $exists: false } },
        { lastName: null },
        { lastName: '' },
        { lastName: { $regex: /^\s*$/ } }
      ],
      $or: [
        { email: { $exists: false } },
        { email: null },
        { email: '' },
        { email: { $regex: /^\s*$/ } }
      ]
    });
    
    console.log(`\n✅ Successfully deleted ${deleteResult.deletedCount} empty users`);
    console.log('🧹 Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error cleaning up empty users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the cleanup
cleanupEmptyUsers()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
