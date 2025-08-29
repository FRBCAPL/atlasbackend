import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixGuestUserAdmin() {
  try {
    console.log('🔍 Fixing guest user admin status...');
    
    // Find and update guest user
    const guestUser = await User.findOne({ email: 'guest@frontrangepool.com' });
    
    if (guestUser) {
      // Ensure guest user is NOT an admin - should see regular player dashboard
      guestUser.isAdmin = false;
      guestUser.isPlatformAdmin = false;
      guestUser.isSuperAdmin = false;
      guestUser.division = 'Guest Division';
      guestUser.divisions = ['Guest Division'];
      guestUser.isApproved = true;
      guestUser.isActive = true;
      
      await guestUser.save();
      
      console.log('✅ Guest user admin status fixed successfully!');
      console.log('📧 Email: guest@frontrangepool.com');
      console.log('🔢 PIN: GUEST');
      console.log('👤 Name: Guest User');
      console.log('🏆 Division: Guest Division');
      console.log('🔧 isAdmin: false');
      console.log('🔧 isPlatformAdmin: false');
      console.log('🔧 isSuperAdmin: false');
      console.log('✅ Approved: Yes');
      console.log('✅ Active: Yes');
      console.log('🎯 Should now see regular player dashboard');
    } else {
      console.log('❌ Guest user not found');
    }
    
  } catch (error) {
    console.error('❌ Error fixing guest user admin status:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
fixGuestUserAdmin();
