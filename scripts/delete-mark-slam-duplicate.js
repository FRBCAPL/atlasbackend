import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const deleteMarkSlamDuplicate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🗑️  Deleting duplicate Mark Slam entry...\n');

    // The ID of the duplicate entry with mark.slam@example.com
    const duplicateId = '68ad54c8b8a1337d2a5a7efb';

    // First, let's verify what we're about to delete
    const duplicateEntry = await User.findById(duplicateId);
    if (!duplicateEntry) {
      console.log('❌ Duplicate entry not found. It may have already been deleted.');
      process.exit(0);
    }

    console.log('📋 About to delete this entry:');
    console.log(`   Name: ${duplicateEntry.firstName} ${duplicateEntry.lastName}`);
    console.log(`   Email: ${duplicateEntry.email}`);
    console.log(`   Phone: ${duplicateEntry.phone}`);
    console.log(`   ID: ${duplicateEntry._id}`);
    console.log(`   Divisions: ${duplicateEntry.divisions?.join(', ') || 'None'}`);
    console.log('');

    // Confirm deletion
    console.log('⚠️  Are you sure you want to delete this entry? (y/N)');
    
    // For automated deletion, we'll proceed
    console.log('Proceeding with deletion...');

    // Delete the duplicate entry
    const result = await User.findByIdAndDelete(duplicateId);
    
    if (result) {
      console.log('✅ Successfully deleted duplicate Mark Slam entry!');
      console.log(`   Deleted: ${result.firstName} ${result.lastName} (${result.email})`);
    } else {
      console.log('❌ Failed to delete entry. It may have already been deleted.');
    }

    // Verify the deletion
    console.log('\n🔍 Verifying deletion...');
    const remainingEntries = await User.find({
      $or: [
        { firstName: 'Mark', lastName: 'Slam' },
        { email: { $regex: /mark.*slam/i } }
      ]
    }).lean();

    console.log(`Found ${remainingEntries.length} remaining Mark Slam entries:`);
    remainingEntries.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.firstName} ${entry.lastName}`);
      console.log(`     Email: ${entry.email}`);
      console.log(`     Phone: ${entry.phone}`);
      console.log(`     ID: ${entry._id}`);
      console.log('');
    });

    if (remainingEntries.length === 1 && remainingEntries[0].email === 'frbcapl@gmail.com') {
      console.log('🎉 Perfect! Only the correct Mark Slam entry remains.');
      console.log('   You can now update the phone number for the correct entry.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

deleteMarkSlamDuplicate();
