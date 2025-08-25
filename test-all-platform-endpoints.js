import fetch from 'node-fetch';

const headers = {
  'x-admin-email': 'frbcapl@gmail.com',
  'x-admin-pin': '777777'
};

async function testEndpoint(name, url) {
  try {
    console.log(`🔍 Testing ${name}...`);
    const response = await fetch(url, { headers });
    console.log(`✅ ${name}: ${response.status} - ${response.statusText}`);
    
    if (response.status !== 200) {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function testAllEndpoints() {
  console.log('🚀 Testing all platform admin endpoints...\n');
  
  const baseUrl = 'http://localhost:8080/api/platform';
  
  await testEndpoint('Platform Stats', `${baseUrl}/stats`);
  await testEndpoint('Platform Admins', `${baseUrl}/admins`);
  await testEndpoint('Platform Leagues', `${baseUrl}/leagues`);
  await testEndpoint('Platform Operators', `${baseUrl}/operators`);
  
  console.log('\n✅ All platform admin endpoint tests completed!');
}

testAllEndpoints();
