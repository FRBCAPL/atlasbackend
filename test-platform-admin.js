import mongoose from 'mongoose';
import dotenv from 'dotenv';
import databaseService from './src/services/databaseService.js';
import PlatformAdmin from './src/models/PlatformAdmin.js';

dotenv.config();

async function testPlatformAdmin() {
  try {
    console.log('🔍 Testing Platform Admin Authentication...');
    
    // Connect to registry database
    console.log('📡 Connecting to registry database...');
    const registryConnection = await databaseService.connectToRegistry();
    console.log('✅ Connected to registry database');
    
    // Register the PlatformAdmin model
    console.log('📝 Registering PlatformAdmin model...');
    const PlatformAdminModel = registryConnection.model('PlatformAdmin', PlatformAdmin.schema);
    console.log('✅ PlatformAdmin model registered');
    
    // Try to find the super admin
    console.log('🔍 Looking for super admin...');
    const admin = await PlatformAdminModel.findByEmail('frbcapl@gmail.com');
    
    if (admin) {
      console.log('✅ Found admin:', {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        isActive: admin.isActive,
        isVerified: admin.isVerified
      });
      
      // Test PIN verification
      console.log('🔐 Testing PIN verification...');
      const isValid = await admin.comparePin('777777');
      console.log('PIN verification result:', isValid);
      
    } else {
      console.log('❌ Admin not found');
      
      // List all admins
      console.log('📋 Listing all admins...');
      const allAdmins = await PlatformAdminModel.find({});
      console.log('All admins:', allAdmins.map(a => ({ email: a.email, role: a.role, isActive: a.isActive })));
    }
    
  } catch (error) {
    console.error('❌ Error testing platform admin:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testPlatformAdmin();
