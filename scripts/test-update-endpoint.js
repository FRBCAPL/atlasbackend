import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:8080';

const testUpdateEndpoint = async () => {
  try {
    console.log('🧪 Testing the update endpoint...\n');

    // Mark Slam's user ID
    const userId = '68ad52c2b9909c694ef3b17b';
    
    // Test data
    const updateData = {
      firstName: 'Mark',
      lastName: 'Slam',
      email: 'frbcapl@gmail.com',
      phone: '(555) 999-8888', // New test phone number
      textNumber: '(555) 999-8888',
      emergencyContactName: 'Test Contact',
      emergencyContactPhone: '(555) 111-2222',
      locations: 'Test Location',
      notes: 'Test notes'
    };

    console.log('📋 Sending update request:');
    console.log(`   URL: ${BACKEND_URL}/api/users/${userId}`);
    console.log(`   Method: PUT`);
    console.log(`   Data:`, updateData);

    const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📊 Response OK: ${response.ok}`);

    const result = await response.json();
    console.log(`📊 Response Body:`, JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Update successful!');
      console.log(`   Updated phone: ${result.user?.phone || 'Not returned'}`);
    } else {
      console.log('\n❌ Update failed!');
      console.log(`   Error: ${result.message || result.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
};

testUpdateEndpoint();
