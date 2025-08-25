import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import the PlatformAdmin model
import PlatformAdmin from '../src/models/PlatformAdmin.js';

async function setupSuperAdmin() {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await PlatformAdmin.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists:', existingSuperAdmin.email);
      console.log('If you want to create a new super admin, please delete the existing one first.');
      process.exit(0);
    }

    // Super Admin details as specified by the user
    const primaryEmail = 'frbcapl@gmail.com';
    const secondaryEmail = 'sslampro@gmail.com';
    const firstName = 'Mark';
    const lastName = 'Slam'; // Alias
    const realLastName = 'Lanoue'; // Real last name
    const pin = '777777';
    const password = 'sstop1234slam';

    console.log('🔧 Setting up Super Admin with specified credentials...');

    // Create super admin with all permissions
    const superAdmin = new PlatformAdmin({
      email: primaryEmail.toLowerCase(),
      firstName,
      lastName,
      pin,
      password,
      role: 'super_admin',
      permissions: {
        canCreateLeagues: true,
        canDeleteLeagues: true,
        canManageLeagueOperators: true,
        canManagePlatformAdmins: true,
        canViewAllLeagueData: true,
        canManageBilling: true,
        canManageSystemSettings: true,
        canViewSystemLogs: true,
        canManageBackups: true
      },
      isActive: true,
      isVerified: true,
      // Store additional information in metadata
      metadata: {
        secondaryEmail: secondaryEmail.toLowerCase(),
        realLastName: realLastName,
        alias: lastName,
        notes: 'Super Admin - Platform Owner'
      }
    });

    await superAdmin.save();

    console.log('✅ Super admin created successfully!');
    console.log('📧 Primary Email:', primaryEmail);
    console.log('📧 Secondary Email:', secondaryEmail);
    console.log('👤 Name:', `${firstName} ${lastName} (alias)`);
    console.log('👤 Real Name:', `${firstName} ${realLastName}`);
    console.log('🔢 PIN:', pin);
    console.log('🔑 Password:', password);
    console.log('🔐 Role: super_admin');
    console.log('✅ All permissions granted');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('⚠️  Store these credentials securely!');
    console.log('');
    console.log('📝 Note: The system accepts both "Slam" and "Lanoue" as valid last names');
    console.log('📝 Note: Both email addresses are associated with this account');

  } catch (error) {
    console.error('❌ Error setting up super admin:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the setup
setupSuperAdmin();
