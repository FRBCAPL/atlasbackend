import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function fixEmptyNames() {
  try {
    console.log('🔍 Checking for users with empty names...');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Find users with empty or missing names
    const usersWithEmptyNames = await User.find({
      $or: [
        { firstName: { $exists: false } },
        { firstName: null },
        { firstName: '' },
        { firstName: { $regex: /^\s*$/ } }, // Only whitespace
        { lastName: { $exists: false } },
        { lastName: null },
        { lastName: '' },
        { lastName: { $regex: /^\s*$/ } } // Only whitespace
      ]
    }).select('firstName lastName email _id');
    
    console.log(`📊 Found ${usersWithEmptyNames.length} users with empty names`);
    
    if (usersWithEmptyNames.length === 0) {
      console.log('✅ No users with empty names found!');
      return;
    }
    
    console.log('\n📋 Users with empty names:');
    usersWithEmptyNames.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Email: ${user.email || 'No email'}`);
      console.log(`   First Name: "${user.firstName || 'EMPTY'}"`);
      console.log(`   Last Name: "${user.lastName || 'EMPTY'}"`);
      console.log('');
    });
    
    // Ask if user wants to fix them
    console.log('❓ Do you want to fix these users? (y/n)');
    console.log('💡 You can manually update them in the database or delete them if they are duplicates');
    
    // For now, just show the data. User can manually fix or we can add automatic fixing later
    console.log('\n🔧 To fix these users, you can:');
    console.log('1. Update them manually in your database');
    console.log('2. Delete them if they are duplicates');
    console.log('3. Run a migration script to fix them automatically');
    
  } catch (error) {
    console.error('❌ Error checking users with empty names:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the check
fixEmptyNames()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
