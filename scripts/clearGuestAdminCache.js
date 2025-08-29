import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const clearGuestAdminCache = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Clearing guest user admin cache...');
    
    // Find the guest user
    const guestUser = await User.findOne({ email: 'guest@frontrangepool.com' });
    
    if (!guestUser) {
      console.log('❌ Guest user not found in database');
      return;
    }

    console.log('📊 Current guest user status:');
    console.log(`   - isAdmin: ${guestUser.isAdmin}`);
    console.log(`   - isPlatformAdmin: ${guestUser.isPlatformAdmin}`);
    console.log(`   - isSuperAdmin: ${guestUser.isSuperAdmin}`);
    console.log(`   - role: ${guestUser.role}`);
    console.log(`   - permissions: ${JSON.stringify(guestUser.permissions)}`);

    // Double-check and ensure no admin permissions
    if (guestUser.isAdmin || guestUser.isPlatformAdmin || guestUser.isSuperAdmin || guestUser.role !== 'player') {
      console.log('🔧 Fixing admin permissions...');
      
      await User.findByIdAndUpdate(guestUser._id, {
        isAdmin: false,
        isPlatformAdmin: false,
        isSuperAdmin: false,
        role: 'player',
        permissions: {}
      });
      
      console.log('✅ Admin permissions cleared from database');
    } else {
      console.log('✅ Guest user already has correct permissions');
    }

    console.log('\n🎉 Guest user admin cache cleared!');
    console.log('📋 Next steps:');
    console.log('   1. Clear your browser localStorage:');
    console.log('      - Open Developer Tools (F12)');
    console.log('      - Go to Application/Storage tab');
    console.log('      - Clear localStorage for this site');
    console.log('   2. Refresh the page');
    console.log('   3. Try guest access again');
    console.log('\n💡 The guest user should now see the regular player dashboard');

  } catch (error) {
    console.error('❌ Error clearing guest admin cache:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

console.log(`
🚀 CLEAR GUEST ADMIN CACHE
==========================

📋 This script will:
1. Check guest user permissions in database
2. Ensure all admin flags are false
3. Set role to 'player'
4. Clear all permissions
5. Provide instructions to clear browser cache

🎯 This will fix the admin dashboard issue for guest users
`);

clearGuestAdminCache();
