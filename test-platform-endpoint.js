import fetch from 'node-fetch';

async function testPlatformEndpoint() {
  try {
    console.log('🔍 Testing platform admin endpoint...');
    
    const response = await fetch('http://localhost:8080/api/platform/stats', {
      headers: {
        'x-admin-email': 'frbcapl@gmail.com',
        'x-admin-pin': '777777'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.text();
    console.log('Response:', data);
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
  }
}

testPlatformEndpoint();
