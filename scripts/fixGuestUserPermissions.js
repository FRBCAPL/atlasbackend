import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const fixGuestUserPermissions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔧 Fixing guest user permissions...');
    
    // Find the guest user
    const guestUser = await User.findOne({ email: 'guest@frontrangepool.com' });
    
    if (!guestUser) {
      console.log('❌ Guest user not found. Creating one...');
      
      // Create guest user with correct permissions
      const newGuestUser = new User({
        firstName: 'Guest',
        lastName: 'User',
        email: 'guest@frontrangepool.com',
        pin: 'GUEST',
        isApproved: true,
        isActive: true,
        isAdmin: false,
        isPlatformAdmin: false,
        isSuperAdmin: false,
        role: 'player',
        division: 'Guest Division',
        divisions: ['Guest Division'],
        permissions: {},
        phone: '',
        locations: [],
        availability: []
      });
      
      await newGuestUser.save();
      console.log('✅ Guest user created with correct permissions');
    } else {
      console.log('✅ Guest user found. Updating permissions...');
      
      // Update guest user to ensure no admin permissions
      await User.findByIdAndUpdate(guestUser._id, {
        isAdmin: false,
        isPlatformAdmin: false,
        isSuperAdmin: false,
        role: 'player',
        permissions: {},
        division: 'Guest Division',
        divisions: ['Guest Division']
      });
      
      console.log('✅ Guest user permissions updated');
    }

    // Verify the changes
    const updatedGuestUser = await User.findOne({ email: 'guest@frontrangepool.com' });
    console.log('\n📊 Guest user current status:');
    console.log(`   - isAdmin: ${updatedGuestUser.isAdmin}`);
    console.log(`   - isPlatformAdmin: ${updatedGuestUser.isPlatformAdmin}`);
    console.log(`   - isSuperAdmin: ${updatedGuestUser.isSuperAdmin}`);
    console.log(`   - role: ${updatedGuestUser.role}`);
    console.log(`   - division: ${updatedGuestUser.division}`);
    console.log(`   - permissions: ${JSON.stringify(updatedGuestUser.permissions)}`);

    console.log('\n🎉 Guest user permissions fixed!');
    console.log('✅ Guest user should now see regular player dashboard');

  } catch (error) {
    console.error('❌ Error fixing guest user permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

console.log(`
🚀 FIX GUEST USER PERMISSIONS
=============================

📋 This script will:
1. Find or create the guest user
2. Set all admin flags to false
3. Set role to 'player'
4. Clear all permissions
5. Ensure guest user sees regular dashboard

🎯 This will fix the admin dashboard issue for guest users
`);

fixGuestUserPermissions();
