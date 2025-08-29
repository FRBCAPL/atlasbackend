import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function clearGuestAdminData() {
  try {
    console.log('🔍 Clearing guest user admin data...');
    
    // Find and update guest user
    const guestUser = await User.findOne({ email: 'guest@frontrangepool.com' });
    
    if (guestUser) {
      // Ensure guest user has NO admin privileges
      guestUser.isAdmin = false;
      guestUser.isPlatformAdmin = false;
      guestUser.isSuperAdmin = false;
      guestUser.role = 'player'; // Set role to player
      guestUser.permissions = {}; // Clear any permissions
      guestUser.division = 'Guest Division';
      guestUser.divisions = ['Guest Division'];
      guestUser.isApproved = true;
      guestUser.isActive = true;
      
      await guestUser.save();
      
      console.log('✅ Guest user admin data cleared successfully!');
      console.log('📧 Email: guest@frontrangepool.com');
      console.log('🔢 PIN: GUEST');
      console.log('👤 Name: Guest User');
      console.log('🏆 Division: Guest Division');
      console.log('🔧 isAdmin: false');
      console.log('🔧 isPlatformAdmin: false');
      console.log('🔧 isSuperAdmin: false');
      console.log('🔧 role: player');
      console.log('🔧 permissions: {}');
      console.log('✅ Approved: Yes');
      console.log('✅ Active: Yes');
      console.log('🎯 Should now see regular player dashboard');
      console.log('');
      console.log('⚠️  IMPORTANT: Guest user should also clear browser localStorage:');
      console.log('   - Open browser dev tools (F12)');
      console.log('   - Go to Application/Storage tab');
      console.log('   - Clear localStorage items: adminData, isAdminAuthenticated');
    } else {
      console.log('❌ Guest user not found');
    }
    
  } catch (error) {
    console.error('❌ Error clearing guest user admin data:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
clearGuestAdminData();
