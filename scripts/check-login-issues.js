import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const checkLoginIssues = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n🔍 Checking Login Issues...\n');

    // Get all users
    const allUsers = await User.find({});
    console.log(`Total users: ${allUsers.length}`);

    // Check each user's login status
    const loginIssues = [];
    const workingUsers = [];

    for (const user of allUsers) {
      const issues = [];
      
      // Check if user has required fields
      if (!user.firstName || !user.lastName) {
        issues.push('Missing name');
      }
      
      if (!user.email) {
        issues.push('Missing email');
      }
      
      if (!user.pin) {
        issues.push('Missing PIN');
      }
      
      if (!user.isApproved) {
        issues.push('Not approved');
      }
      
      if (!user.isActive) {
        issues.push('Not active');
      }

      // Test PIN validation
      if (user.pin) {
        try {
          const isValidPin = await user.comparePin(user.pin);
          if (!isValidPin) {
            issues.push('PIN validation fails');
          }
        } catch (error) {
          issues.push(`PIN error: ${error.message}`);
        }
      }

      if (issues.length > 0) {
        loginIssues.push({
          user: `${user.firstName} ${user.lastName}`,
          email: user.email,
          issues: issues
        });
      } else {
        workingUsers.push({
          user: `${user.firstName} ${user.lastName}`,
          email: user.email
        });
      }
    }

    // Report results
    console.log(`✅ Working users: ${workingUsers.length}`);
    console.log(`❌ Users with issues: ${loginIssues.length}`);

    if (workingUsers.length > 0) {
      console.log('\n✅ Users that can log in:');
      workingUsers.forEach(u => {
        console.log(`   - ${u.user} (${u.email})`);
      });
    }

    if (loginIssues.length > 0) {
      console.log('\n❌ Users with login issues:');
      loginIssues.forEach(u => {
        console.log(`   - ${u.user} (${u.email})`);
        console.log(`     Issues: ${u.issues.join(', ')}`);
      });
    }

    // Test specific PINs
    console.log('\n🔍 Testing specific PINs...');
    const testPins = ['1234', '2468', '777777'];
    
    for (const pin of testPins) {
      const usersWithPin = allUsers.filter(u => u.pin);
      let pinMatchCount = 0;
      
      for (const user of usersWithPin) {
        try {
          const isMatch = await user.comparePin(pin);
          if (isMatch) {
            pinMatchCount++;
            console.log(`   PIN ${pin} matches: ${user.firstName} ${user.lastName}`);
          }
        } catch (error) {
          // Skip errors
        }
      }
      
      console.log(`   PIN ${pin}: ${pinMatchCount} users`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkLoginIssues();
