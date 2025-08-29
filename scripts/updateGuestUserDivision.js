import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateGuestUserDivision() {
  try {
    console.log('🔍 Updating guest user division...');
    
    // Find and update guest user
    const guestUser = await User.findOne({ email: 'guest@frontrangepool.com' });
    
    if (guestUser) {
      guestUser.division = 'Guest Division';
      guestUser.divisions = ['Guest Division'];
      
      await guestUser.save();
      
      console.log('✅ Guest user division updated successfully!');
      console.log('📧 Email: guest@frontrangepool.com');
      console.log('🔢 PIN: GUEST');
      console.log('👤 Name: Guest User');
      console.log('🏆 Division: Guest Division');
      console.log('🏆 Divisions Array:', guestUser.divisions);
      console.log('✅ Approved: Yes');
      console.log('✅ Active: Yes');
    } else {
      console.log('❌ Guest user not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating guest user division:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
updateGuestUserDivision();
