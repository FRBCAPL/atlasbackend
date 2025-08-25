import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PlatformAdmin from '../src/models/PlatformAdmin.js';

// Load environment variables
dotenv.config();

async function testSuperAdmin() {
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

    // Test finding super admin by primary email
    console.log('\n🔍 Testing primary email authentication...');
    const adminByPrimary = await PlatformAdmin.findByEmail('frbcapl@gmail.com');
    if (adminByPrimary) {
      console.log('✅ Found admin by primary email');
      console.log('   Name:', adminByPrimary.fullName);
      console.log('   Role:', adminByPrimary.role);
      console.log('   Is Super Admin:', adminByPrimary.isSuperAdmin);
    } else {
      console.log('❌ Admin not found by primary email');
    }

    // Test finding super admin by secondary email
    console.log('\n🔍 Testing secondary email authentication...');
    const adminBySecondary = await PlatformAdmin.findByEmail('sslampro@gmail.com');
    if (adminBySecondary) {
      console.log('✅ Found admin by secondary email');
      console.log('   Name:', adminBySecondary.fullName);
      console.log('   Role:', adminBySecondary.role);
      console.log('   Is Super Admin:', adminBySecondary.isSuperAdmin);
    } else {
      console.log('❌ Admin not found by secondary email');
    }

    // Test password authentication
    if (adminByPrimary) {
      console.log('\n🔍 Testing password authentication...');
      const isValidPassword = await adminByPrimary.comparePassword('sstop1234slam');
      console.log('   Password valid:', isValidPassword ? '✅' : '❌');
    }

    // Test PIN authentication
    if (adminByPrimary) {
      console.log('\n🔍 Testing PIN authentication...');
      const isValidPin = await adminByPrimary.comparePin('777777');
      console.log('   PIN valid:', isValidPin ? '✅' : '❌');
    }

    // Test email validation method
    if (adminByPrimary) {
      console.log('\n🔍 Testing email validation method...');
      const primaryValid = adminByPrimary.isValidEmail('frbcapl@gmail.com');
      const secondaryValid = adminByPrimary.isValidEmail('sslampro@gmail.com');
      const invalidEmail = adminByPrimary.isValidEmail('invalid@email.com');
      
      console.log('   Primary email valid:', primaryValid ? '✅' : '❌');
      console.log('   Secondary email valid:', secondaryValid ? '✅' : '❌');
      console.log('   Invalid email valid:', invalidEmail ? '❌' : '✅');
    }

    // Display metadata
    if (adminByPrimary && adminByPrimary.metadata) {
      console.log('\n📋 Admin Metadata:');
      console.log('   Secondary Email:', adminByPrimary.metadata.secondaryEmail);
      console.log('   Real Last Name:', adminByPrimary.metadata.realLastName);
      console.log('   Alias:', adminByPrimary.metadata.alias);
      console.log('   Notes:', adminByPrimary.metadata.notes);
    }

    console.log('\n✅ Super Admin test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing super admin:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testSuperAdmin();
