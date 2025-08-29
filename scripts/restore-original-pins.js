import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const restoreOriginalPins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔧 Restoring Original PINs from Google Sheet...\n');

    // Original PINs from the Google Sheet
    const originalPins = {
      'frbcapl@gmail.com': '777777', // Mark Slam
      'kristyncristable@gmail.com': '3468', // Mark Test
      'randyfishburn@msn.com': '5151', // Randy Fishburn
      'rmeindl@aol.com': '7485', // Ryan Meindl
      'c.m.anderson0001@gmail.com': '1919', // Christopher Anderson
      'rfishburn01@gmail.com': '0100', // Randall Fishburn
      'donlowe@gmail.com': '1234', // Don Lowe
      'lucastaylor@hotmail.com': '2131', // Lucas Taylor
      'vivey@gmail.com': '1531', // Vince Ivey
      'jneumann@gmail.com': '3735', // Tony Neumann
      'jch_34@yahoo.com': '4133', // Jeff Chichester
      'sammerritt@yahoo.com': '3679', // Sam Merritt
      'mikethis123@gmail.com': '0532', // Michael Thistlewood
      'johanna.graclik@gmail.com': '0688', // Jo Graclik
      'jgibson@yahoo.com': '0173', // Jon Gibson
      'lyndlnav@gmail.com': '3297', // Lyndl Navarrete
      'donlowe722@gmail.com': '0110' // Don Lowe (second entry)
    };

    console.log(`📋 Found ${Object.keys(originalPins).length} original PINs`);

    // Update each user with their correct PIN
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const [email, pin] of Object.entries(originalPins)) {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (user) {
        // Update the PIN (will be hashed by pre-save hook)
        user.pin = pin;
        await user.save();
        
        console.log(`✅ Updated: ${user.firstName} ${user.lastName} (${email}) → PIN: ${pin}`);
        updatedCount++;
      } else {
        console.log(`❌ Not found: ${email} (PIN: ${pin})`);
        notFoundCount++;
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Updated: ${updatedCount} users`);
    console.log(`   ❌ Not found: ${notFoundCount} users`);

    // Verify the updates
    console.log(`\n🔍 Verifying PINs...`);
    for (const [email, expectedPin] of Object.entries(originalPins)) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        const isValidPin = await user.comparePin(expectedPin);
        if (isValidPin) {
          console.log(`   ✅ ${user.firstName} ${user.lastName}: PIN ${expectedPin} works`);
        } else {
          console.log(`   ❌ ${user.firstName} ${user.lastName}: PIN ${expectedPin} failed`);
        }
      }
    }

    console.log(`\n🎉 Original PINs restored!`);
    console.log(`   Each player now has their correct unique PIN`);
    console.log(`   Login should work properly now`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

restoreOriginalPins();
