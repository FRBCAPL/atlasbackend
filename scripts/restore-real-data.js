import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const restoreRealData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔧 Restoring Real Email Addresses and PINs...\n');

    // Restore the REAL data from your original database records
    const realData = [
      { currentEmail: 'lbcmarkslam@gmail.com', realEmail: 'lbcmarkslam@gmail.com', pin: '1234', name: 'Beta Test User' },
      { currentEmail: 'frbcapl@gmail.com', realEmail: 'frbcapl@gmail.com', pin: '777777', name: 'Mark Slam' },
      { currentEmail: 'slamproatulive@gmail.com', realEmail: 'slamproatulive@gmail.com', pin: '2468', name: 'Mark Test' },
      { currentEmail: 'randyfishburn@msn.com', realEmail: 'randyfishburn@msn.com', pin: '5151', name: 'Randy Fishburn' },
      { currentEmail: 'rmeindl99@gmail.com', realEmail: 'rmeindl99@gmail.com', pin: '7485', name: 'Ryan Meindl' },
      { currentEmail: 'c.m.anderson0001@gmail.com', realEmail: 'c.m.anderson0001@gmail.com', pin: '1949', name: 'Christopher Anderson' },
      { currentEmail: 'rjfishburn03@gmail.com', realEmail: 'rjfishburn03@gmail.com', pin: '0166', name: 'Randall Fishburn' },
      { currentEmail: 'ltministries@hotmail.com', realEmail: 'ltministries@hotmail.com', pin: '1224', name: 'Lucas Taylor' },
      { currentEmail: 'tomtowman2121@gmail.com', realEmail: 'tomtowman2121@gmail.com', pin: '2131', name: 'Tom Barnard' },
      { currentEmail: 'iveyvd@gmail.com', realEmail: 'iveyvd@gmail.com', pin: '1534', name: 'Vince Ivey' },
      { currentEmail: 'jotocolorado@gmail.com', realEmail: 'jotocolorado@gmail.com', pin: '3736', name: 'Tony Neumann' },
      { currentEmail: 'jchi_34@yahoo.com', realEmail: 'jchi_34@yahoo.com', pin: '4133', name: 'Jeff Chichester' },
      { currentEmail: 'samuellmerritt@yahoo.com', realEmail: 'samuellmerritt@yahoo.com', pin: '3679', name: 'Sam Merritt' },
      { currentEmail: 'mikethis423@gmail.com', realEmail: 'mikethis423@gmail.com', pin: '1252', name: 'Michael Thistlewood' },
      { currentEmail: 'johanna.graclik@gmail.com', realEmail: 'johanna.graclik@gmail.com', pin: '0698', name: 'Jo Graclik' },
      { currentEmail: 'jon600cbr@yahoo.com', realEmail: 'jon600cbr@yahoo.com', pin: '0173', name: 'Jon Glennon' },
      { currentEmail: 'lyndlcnav@gmail.com', realEmail: 'lyndlcnav@gmail.com', pin: '3267', name: 'Lyndl Navarrete' }
    ];

    let updatedCount = 0;

    // First, let's see what users we have
    const allUsers = await User.find({});
    console.log(`Total users in database: ${allUsers.length}`);

    // Update each user with their real email and PIN
    for (const data of realData) {
      // Find user by current email or name
      let user = await User.findOne({ email: data.currentEmail });
      
      if (!user) {
        // Try to find by name if email doesn't match
        user = await User.findOne({ 
          firstName: data.name.split(' ')[0], 
          lastName: data.name.split(' ')[1] 
        });
      }

      if (user) {
        console.log(`Updating ${user.firstName} ${user.lastName} to real email: ${data.realEmail} and PIN: ${data.pin}`);
        
        const result = await User.updateOne(
          { _id: user._id },
          { 
            $set: { 
              email: data.realEmail,
              pin: data.pin
            } 
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`   ✅ Updated ${user.firstName} ${user.lastName}`);
          updatedCount++;
        }
      } else {
        console.log(`❌ Could not find user for: ${data.name} (${data.currentEmail})`);
      }
    }

    console.log(`\n🎉 Updated ${updatedCount} users with real data`);

    // Test the login now
    console.log('\n🔍 Testing login with real data...');
    
    const testUser = await User.findOne({ email: 'randyfishburn@msn.com' });
    if (testUser) {
      console.log(`✅ Found user: ${testUser.firstName} ${testUser.lastName}`);
      console.log(`   Email: ${testUser.email}`);
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

restoreRealData();
