import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const fixPinsSimple = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔧 Fixing PINs - Simple Version...\n');

    // Use the EXACT emails and PINs from your database records
    const updates = [
      { email: 'lbcmarkslam@gmail.com', pin: '1234' },
      { email: 'frbcapl@gmail.com', pin: '777777' },
      { email: 'slamproatulive@gmail.com', pin: '2468' },
      { email: 'randyfishburn@msn.com', pin: '5151' },
      { email: 'rmeindl99@gmail.com', pin: '7485' },
      { email: 'c.m.anderson0001@gmail.com', pin: '1949' },
      { email: 'rjfishburn03@gmail.com', pin: '0166' },
      { email: 'ltministries@hotmail.com', pin: '1224' },
      { email: 'tomtowman2121@gmail.com', pin: '2131' },
      { email: 'iveyvd@gmail.com', pin: '1534' },
      { email: 'jotocolorado@gmail.com', pin: '3736' },
      { email: 'jchi_34@yahoo.com', pin: '4133' },
      { email: 'samuellmerritt@yahoo.com', pin: '3679' },
      { email: 'mikethis423@gmail.com', pin: '1252' },
      { email: 'johanna.graclik@gmail.com', pin: '0698' },
      { email: 'jon600cbr@yahoo.com', pin: '0173' },
      { email: 'lyndlcnav@gmail.com', pin: '3267' }
    ];

    let updatedCount = 0;

    for (const update of updates) {
      const result = await User.updateOne(
        { email: update.email },
        { $set: { pin: update.pin } }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${update.email} to PIN: ${update.pin}`);
        updatedCount++;
      } else {
        console.log(`❌ User not found: ${update.email}`);
      }
    }

    console.log(`\n🎉 Updated ${updatedCount} users`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixPinsSimple();
