import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:8080';

const testAdminApproval = async () => {
  console.log('🧪 Testing Admin Approval Process for Ladder Players\n');

  // Test cases for the new admin approval process
  const testCases = [
    {
      name: 'Test name-only access (should require admin approval)',
      data: { 
        firstName: 'Brett', 
        lastName: 'Gonzalez' 
      },
      description: 'Should require admin approval for Brett Gonzalez (no email/PIN)'
    },
    {
      name: 'Test application submission for existing ladder player',
      data: { 
        firstName: 'Brett', 
        lastName: 'Gonzalez',
        email: 'brett.gonzalez@test.com',
        phone: '555-1234'
      },
      description: 'Should submit application for Brett Gonzalez'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Input: ${JSON.stringify(testCase.data)}`);

    try {
      let endpoint, method;
      
      if (testCase.data.email) {
        // This is an application submission
        endpoint = '/api/ladder/apply-for-existing-ladder-account';
        method = 'POST';
      } else {
        // This is a name-only access attempt
        endpoint = '/api/ladder/claim-account';
        method = 'POST';
      }

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      const result = await response.json();
      
      console.log(`   Status: ${response.status}`);
      
      if (response.ok && result.success) {
        console.log(`   ✅ SUCCESS: ${result.message}`);
        if (result.playerInfo) {
          console.log(`   📋 Player Info: Position ${result.playerInfo.position} in ${result.playerInfo.ladderName} ladder`);
        }
        if (result.applicationId) {
          console.log(`   📝 Application ID: ${result.applicationId}`);
        }
      } else if (result.requiresApproval) {
        console.log(`   ⏳ REQUIRES APPROVAL: ${result.message}`);
        console.log(`   📋 Player Found: ${result.playerInfo.firstName} ${result.playerInfo.lastName}`);
        console.log(`   📊 Position: ${result.playerInfo.position} in ${result.playerInfo.ladderName} ladder`);
      } else {
        console.log(`   ❌ ERROR: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ EXCEPTION: ${error.message}`);
    }
  }
};

// Run the test
testAdminApproval().catch(console.error);
