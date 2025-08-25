import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkApprovalStatus() {
  try {
    console.log('🔍 Checking user approval status for login issues...');
    
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    const users = await User.find({}).select('firstName lastName email isApproved isActive isAdmin');
    
    console.log(`📊 Found ${users.length} total users in database`);
    console.log('\n=== USER APPROVAL STATUS ===');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   - Approved: ${user.isApproved ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Active: ${user.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Admin: ${user.isAdmin ? '✅ YES' : '❌ NO'}`);
      
      // Check if user can login
      const canLogin = user.isApproved && user.isActive;
      console.log(`   - Can Login: ${canLogin ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
    
    // Summary
    const approvedUsers = users.filter(u => u.isApproved);
    const activeUsers = users.filter(u => u.isActive);
    const canLoginUsers = users.filter(u => u.isApproved && u.isActive);
    const adminUsers = users.filter(u => u.isAdmin);
    
    console.log('=== SUMMARY ===');
    console.log(`Total Users: ${users.length}`);
    console.log(`Approved Users: ${approvedUsers.length}`);
    console.log(`Active Users: ${activeUsers.length}`);
    console.log(`Users Who Can Login: ${canLoginUsers.length}`);
    console.log(`Admin Users: ${adminUsers.length}`);
    
    if (canLoginUsers.length === 0) {
      console.log('\n❌ CRITICAL: No users can login!');
      console.log('💡 You need to approve at least one user or check the approval status.');
    } else if (canLoginUsers.length === 1 && canLoginUsers[0].isAdmin) {
      console.log('\n⚠️  WARNING: Only admin user can login');
      console.log('💡 You need to approve other users for testing.');
    }
    
  } catch (error) {
    console.error('❌ Error checking approval status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

checkApprovalStatus()
  .then(() => {
    console.log('🎉 Approval status check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Approval status check failed:', error);
    process.exit(1);
  });
