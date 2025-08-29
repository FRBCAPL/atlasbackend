import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createGuestUser() {
  try {
    console.log('👤 Creating guest user...');

    // Check if guest user already exists
    const existingGuest = await User.findOne({ email: 'guest@frontrangepool.com' });
    
    if (existingGuest) {
      console.log('⚠️  Guest user already exists, updating...');
      
      // Update existing guest user with current data
      existingGuest.firstName = 'Guest';
      existingGuest.lastName = 'User';
      existingGuest.phone = '555-0000';
      existingGuest.textNumber = '';
      existingGuest.emergencyContactName = '';
      existingGuest.emergencyContactPhone = '';
      existingGuest.preferredContacts = ['email'];
      existingGuest.availability = {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: [],
        Sun: []
      };
      existingGuest.locations = 'Guest Access';
      existingGuest.pin = 'GUEST';
      existingGuest.division = 'Guest';
      existingGuest.isApproved = true;
      existingGuest.isActive = true;
      existingGuest.isAdmin = false;
      existingGuest.notes = 'Guest user for app preview - Limited functionality';
      existingGuest.totalMatches = 0;
      existingGuest.wins = 0;
      existingGuest.losses = 0;
      
      await existingGuest.save();
      console.log('✅ Guest user updated successfully!');
      
    } else {
      // Create new guest user
      const guestUser = new User({
        firstName: 'Guest',
        lastName: 'User',
        email: 'guest@frontrangepool.com',
        phone: '555-0000',
        textNumber: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        preferredContacts: ['email'],
        availability: {
          Mon: [],
          Tue: [],
          Wed: [],
          Thu: [],
          Fri: [],
          Sat: [],
          Sun: []
        },
        locations: 'Guest Access',
        pin: 'GUEST',
        division: 'Guest',
        isApproved: true,
        isActive: true,
        isAdmin: false,
        notes: 'Guest user for app preview - Limited functionality',
        totalMatches: 0,
        wins: 0,
        losses: 0
      });

      await guestUser.save();
      console.log('✅ Guest user created successfully!');
    }

    console.log('📧 Email: guest@frontrangepool.com');
    console.log('🔢 PIN: GUEST');
    console.log('👤 Name: Guest User');
    console.log('🎯 Purpose: App preview with limited functionality');
    console.log('✅ Approved: Yes');
    console.log('✅ Active: Yes');

  } catch (error) {
    console.error('❌ Error creating guest user:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
createGuestUser();
