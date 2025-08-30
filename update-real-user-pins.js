import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import UnifiedUser from './src/models/UnifiedUser.js';

async function updateRealUserPins() {
  try {
    console.log('🔧 UPDATING REAL USER PINS');
    console.log('==========================\n');

    // Connect to MongoDB
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Real user data from Google Sheet
    const realUsers = [
      { firstName: 'Beta Test', lastName: 'User', email: 'lbcmarkslam@gmail.com', pin: '1234' },
      { firstName: 'Mark', lastName: 'Slam', email: 'frbcapl@gmail.com', pin: '777777' },
      { firstName: 'Mark', lastName: 'Test', email: 'slamproatulive@gmail.com', pin: '2468' },
      { firstName: 'Randy', lastName: 'Fishburn', email: 'randyfishburn@msn.com', pin: '5151' },
      { firstName: 'Ryan', lastName: 'Meindl', email: 'rmeindl99@gmail.com', pin: '7485' },
      { firstName: 'Christopher', lastName: 'Anderson', email: 'c.m.anderson0001@gmail.com', pin: '1949' },
      { firstName: 'Randall', lastName: 'Fishburn', email: 'rjfishburn03@gmail.com', pin: '0166' },
      { firstName: 'Mark', lastName: 'Edit', email: '', pin: '3233' },
      { firstName: 'Lucas', lastName: 'Taylor', email: 'ltministries@hotmail.com', pin: '1224' },
      { firstName: 'Christopher', lastName: 'Sisneros', email: '', pin: '2867' },
      { firstName: 'Tom', lastName: 'Barnard', email: 'tomtowman2121@gmail.com', pin: '2131' },
      { firstName: 'Vince', lastName: 'Ivey', email: 'iveyvd@gmail.com', pin: '1534' },
      { firstName: 'Tony', lastName: 'Neumann', email: 'jotocolorado@gmail.com', pin: '3736' },
      { firstName: 'Jeff', lastName: 'Chichester', email: 'jchi_34@yahoo.com', pin: '4133' },
      { firstName: 'Sam', lastName: 'Merritt', email: 'samuellmerritt@yahoo.com', pin: '3679' },
      { firstName: 'Michael', lastName: 'Thistlewood', email: 'mikethis423@gmail.com', pin: '1252' },
      { firstName: 'Jo', lastName: 'Graclik', email: 'johanna.graclik@gmail.com', pin: '0698' },
      { firstName: 'Jon', lastName: 'Glennon', email: 'jon600cbr@yahoo.com', pin: '0173' },
      { firstName: 'Lyndl', lastName: 'Navarrete', email: 'lyndlcnav@gmail.com', pin: '3267' },
      { firstName: 'Don', lastName: 'Lowe', email: 'sacodo752@gmail.com', pin: '0110' }
    ];

    console.log(`📊 Updating ${realUsers.length} real users with correct PINs:\n`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const realUser of realUsers) {
      // Find the user by name and email (if email exists)
      let existingUser;
      
      if (realUser.email) {
        // User has email - find by email
        existingUser = await UnifiedUser.findOne({
          email: { $regex: new RegExp(`^${realUser.email}$`, 'i') }
        });
      } else {
        // User has no email - find by name only
        existingUser = await UnifiedUser.findOne({
          firstName: { $regex: new RegExp(`^${realUser.firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${realUser.lastName}$`, 'i') }
        });
      }

      if (existingUser) {
        // Update the user with correct PIN
        existingUser.pin = realUser.pin;
        await existingUser.save();
        
        console.log(`✅ Updated: ${existingUser.firstName} ${existingUser.lastName} - PIN: ${realUser.pin} - Email: ${existingUser.email || 'NO EMAIL'}`);
        updatedCount++;
      } else {
        console.log(`❌ Not found: ${realUser.firstName} ${realUser.lastName} - PIN: ${realUser.pin} - Email: ${realUser.email || 'NO EMAIL'}`);
        notFoundCount++;
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`❌ Not found: ${notFoundCount} users`);

    console.log('\n✅ Update complete!');
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateRealUserPins();
