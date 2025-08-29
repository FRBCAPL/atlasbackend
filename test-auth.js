import dotenv from 'dotenv';
import databaseService from './src/services/databaseService.js';
import PlatformAdmin from './src/models/PlatformAdmin.js';

dotenv.config();

async function testAuth() {
  try {
    console.log('🔍 Testing platform admin authentication...');
    
    // Connect to registry database
    const registryConnection = await databaseService.connectToRegistry();
    console.log('✅ Connected to registry database');
    
    // Get PlatformAdmin model
    const PlatformAdminModel = registryConnection.model('PlatformAdmin', PlatformAdmin.schema);
    console.log('✅ PlatformAdmin model loaded');
    
    // Test finding admin by email
    const admin = await PlatformAdminModel.findByEmail('frbcapl@gmail.com');
    console.log('🔍 Looking for admin with email: frbcapl@gmail.com');
    
    if (admin) {
      console.log('✅ Admin found:', admin.email, 'Role:', admin.role);
      
      // Test PIN comparison
      const isValid = await admin.comparePin('777777');
      console.log('🔍 Testing PIN comparison...');
      console.log('✅ PIN valid:', isValid);
      
    } else {
      console.log('❌ Admin not found');
    }
    
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuth();
