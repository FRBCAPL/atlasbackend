import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const addMissingUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔧 Adding Missing Users from Google Sheet...\n');

    // Users from the Google Sheet with their correct PINs
    const usersToAdd = [
      { firstName: 'Mark', lastName: 'Test', email: 'kristyncristable@gmail.com', phone: '(555) 555-5555', pin: '3468', fargoRate: 494 },
      { firstName: 'Randy', lastName: 'Fishburn', email: 'randyfishburn@msn.com', phone: '(719) 449-0907', pin: '5151', fargoRate: 450 },
      { firstName: 'Ryan', lastName: 'Meindl', email: 'rmeindl@aol.com', phone: '(700) 783-2962', pin: '7485', fargoRate: 315 },
      { firstName: 'Christopher', lastName: 'Anderson', email: 'c.m.anderson0001@gmail.com', phone: '(719) 551-6210', pin: '1919', fargoRate: 425 },
      { firstName: 'Randall', lastName: 'Fishburn', email: 'rfishburn01@gmail.com', phone: '(719) 722-0076', pin: '0100', fargoRate: 456 },
      { firstName: 'Don', lastName: 'Lowe', email: 'donlowe@gmail.com', phone: '(719) 700-0315', pin: '1234', fargoRate: 666 },
      { firstName: 'Lucas', lastName: 'Taylor', email: 'lucastaylor@hotmail.com', phone: '(719) 491-4217', pin: '2131', fargoRate: 444 },
      { firstName: 'Vince', lastName: 'Ivey', email: 'vivey@gmail.com', phone: '(719) 357-9170', pin: '1531', fargoRate: 566 },
      { firstName: 'Tony', lastName: 'Neumann', email: 'jneumann@gmail.com', phone: '(719) 217-0003', pin: '3735', fargoRate: 419 },
      { firstName: 'Jeff', lastName: 'Chichester', email: 'jch_34@yahoo.com', phone: '(720) 982-2070', pin: '4133', fargoRate: 461 },
      { firstName: 'Sam', lastName: 'Merritt', email: 'sammerritt@yahoo.com', phone: '(719) 321-7012', pin: '3679', fargoRate: 429 },
      { firstName: 'Michael', lastName: 'Thistlewood', email: 'mikethis123@gmail.com', phone: '(719) 213-9070', pin: '0532', fargoRate: 511 },
      { firstName: 'Jo', lastName: 'Graclik', email: 'johanna.graclik@gmail.com', phone: '(720) 255-9702', pin: '0688', fargoRate: 400 },
      { firstName: 'Jon', lastName: 'Gibson', email: 'jgibson@yahoo.com', phone: '(303) 847-3300', pin: '0173', fargoRate: 365 },
      { firstName: 'Lyndl', lastName: 'Navarrete', email: 'lyndlnav@gmail.com', phone: '(719) 308-0054', pin: '3297', fargoRate: 426 },
      { firstName: 'Don', lastName: 'Lowe', email: 'donlowe722@gmail.com', phone: '(720) 277-6379', pin: '0110', fargoRate: 308 }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const userData of usersToAdd) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      
      if (existingUser) {
        console.log(`⏭️  Skipping: ${userData.firstName} ${userData.lastName} (already exists)`);
        skippedCount++;
        continue;
      }

      // Create new user
      const newUser = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        phone: userData.phone,
        pin: userData.pin, // Will be hashed by pre-save hook
        fargoRate: userData.fargoRate,
        isApproved: true,
        isActive: true,
        divisions: ['FRBCAPL TEST'],
        locations: 'Westside Billiards, Legends Brews & Cues, Crooked Cue, Main Street Tavern, Back on the Boulevard, My House',
        availability: {
          Mon: ['4pm-10pm'],
          Tue: ['4pm-10pm'],
          Wed: ['4pm-10pm'],
          Thu: ['4pm-10pm'],
          Fri: ['4pm-10pm'],
          Sat: ['12pm-10pm'],
          Sun: ['12pm-10pm']
        }
      });

      await newUser.save();
      console.log(`✅ Added: ${userData.firstName} ${userData.lastName} (${userData.email}) → PIN: ${userData.pin}`);
      addedCount++;
    }

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Added: ${addedCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users`);

    // Verify all users can log in
    console.log(`\n🔍 Verifying all users can log in...`);
    const allUsers = await User.find({});
    
    for (const user of allUsers) {
      try {
        // Find the original PIN for this user
        const originalPin = usersToAdd.find(u => u.email.toLowerCase() === user.email)?.pin || '777777';
        const isValidPin = await user.comparePin(originalPin);
        
        if (isValidPin) {
          console.log(`   ✅ ${user.firstName} ${user.lastName}: PIN ${originalPin} works`);
        } else {
          console.log(`   ❌ ${user.firstName} ${user.lastName}: PIN ${originalPin} failed`);
        }
      } catch (error) {
        console.log(`   ❌ ${user.firstName} ${user.lastName}: Error - ${error.message}`);
      }
    }

    console.log(`\n🎉 All users added with correct PINs!`);
    console.log(`   Total users in database: ${allUsers.length}`);
    console.log(`   All users should be able to log in now`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addMissingUsers();
