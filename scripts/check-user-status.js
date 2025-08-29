import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const checkUserStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔍 Checking User Status for Login...\n');

    const allUsers = await User.find({});
    console.log(`Total users: ${allUsers.length}`);

    const loginIssues = [];
    const workingUsers = [];

    for (const user of allUsers) {
      const issues = [];
      
      if (!user.isApproved) {
        issues.push('Not approved');
      }
      
      if (!user.isActive) {
        issues.push('Not active');
      }
      
      if (!user.pin) {
        issues.push('No PIN');
      }

      if (issues.length > 0) {
        loginIssues.push({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          issues: issues
        });
      } else {
        workingUsers.push({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        });
      }
    }

    console.log(`✅ Users that can log in: ${workingUsers.length}`);
    console.log(`❌ Users with login issues: ${loginIssues.length}`);

    if (workingUsers.length > 0) {
      console.log('\n✅ Users that can log in:');
      workingUsers.forEach(u => {
        console.log(`   - ${u.name} (${u.email})`);
      });
    }

    if (loginIssues.length > 0) {
      console.log('\n❌ Users with login issues:');
      loginIssues.forEach(u => {
        console.log(`   - ${u.name} (${u.email})`);
        console.log(`     Issues: ${u.issues.join(', ')}`);
      });
    }

    // Fix users that aren't approved or active
    if (loginIssues.length > 0) {
      console.log('\n🔧 Fixing user status...');
      let fixedCount = 0;
      
      for (const issue of loginIssues) {
        const user = await User.findOne({ email: issue.email });
        if (user) {
          let needsUpdate = false;
          
          if (!user.isApproved) {
            user.isApproved = true;
            needsUpdate = true;
          }
          
          if (!user.isActive) {
            user.isActive = true;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            await user.save();
            console.log(`   ✅ Fixed: ${user.firstName} ${user.lastName}`);
            fixedCount++;
          }
        }
      }
      
      console.log(`   Total fixed: ${fixedCount}`);
    }

    console.log('\n🎉 All users should now be able to log in!');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUserStatus();
