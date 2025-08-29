import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const fixPinsToPlaintext = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔧 Fixing PINs to Plain Text...\n');

    // First, let's see what users actually exist
    const allUsers = await User.find({});
    console.log(`Total users in database: ${allUsers.length}`);
    
    console.log('\nExisting users:');
    allUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - Current PIN: ${user.pin}`);
    });

    // Map of names to their correct PINs from your database records
    const pinMap = {
      'Mark Slam': '777777',
      'Mark Test': '2468',
      'Randy Fishburn': '5151',
      'Randall Fishburn': '0166',
      'Don Lowe': '3233',
      'Lucas Taylor': '1224',
      'Vince Ivey': '1534',
      'Tom Barnard': '2131',
      'Jeff Chichester': '4133',
      'Sam Merritt': '3679',
      'Michael Thistlewood': '1252',
      'Jo Craclik': '0698',
      'Jon Glennon': '0173',
      'Lyndl Navarrete': '3267',
      'Tony Neumann': '3736',
      'Jo Graclik': '0698'
    };

    let updatedCount = 0;

    // Update each user that exists
    for (const user of allUsers) {
      const fullName = `${user.firstName} ${user.lastName}`;
      const correctPin = pinMap[fullName];
      if (correctPin) {
        console.log(`Updating ${fullName} to PIN: ${correctPin}`);
        
        const result = await User.updateOne(
          { _id: user._id },
          { $set: { pin: correctPin } }
        );

        if (result.modifiedCount > 0) {
          console.log(`   ✅ Updated ${fullName}`);
          updatedCount++;
        }
      } else {
        console.log(`   ⚠️  No PIN mapping found for ${fullName}`);
      }
    }

    console.log(`\n🎉 Updated ${updatedCount} users with plain text PINs`);

    // Test the login now
    console.log('\n🔍 Testing login with plain text PINs...');
    
    const testUser = await User.findOne({ firstName: 'Randy', lastName: 'Fishburn' });
    if (testUser) {
      console.log(`✅ Found user: ${testUser.firstName} ${testUser.lastName}`);
      console.log(`   PIN: ${testUser.pin}`);
      console.log(`   isApproved: ${testUser.isApproved}`);
      console.log(`   isActive: ${testUser.isActive}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixPinsToPlaintext();
