import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:8080';

const testNameOnlyAccess = async () => {
  console.log('🧪 Testing Name-Only Access for Ladder Players\n');

  // Test cases for players who might only have names in the ladder
  const testCases = [
    {
      name: 'Test with real ladder player name only',
      data: { 
        firstName: 'Brett', 
        lastName: 'Gonzalez' 
      },
      description: 'Should grant access to Brett Gonzalez (ladder player with no email/PIN)'
    },
    {
      name: 'Test with another real ladder player name only',
      data: { 
        firstName: 'Tito', 
        lastName: 'Rodriguez' 
      },
      description: 'Should grant access to Tito Rodriguez (ladder player with no email/PIN)'
    },
    {
      name: 'Test with name and empty email',
      data: { 
        firstName: 'Lawrence', 
        lastName: 'Anaya',
        email: ''
      },
      description: 'Should handle Lawrence Anaya with empty email field'
    },
    {
      name: 'Test with name and empty PIN',
      data: { 
        firstName: 'Ramsey', 
        lastName: 'Knowles',
        pin: ''
      },
      description: 'Should handle Ramsey Knowles with empty PIN field'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Input: ${JSON.stringify(testCase.data)}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ladder/claim-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      const result = await response.json();
      
      console.log(`   Status: ${response.status}`);
      
      if (response.ok && result.success) {
        console.log(`   ✅ SUCCESS: ${result.message}`);
        console.log(`   📋 Player Type: ${result.playerType}`);
        console.log(`   🔓 Access Granted: ${result.accessGranted}`);
        if (result.playerInfo) {
          console.log(`   👤 Player Info: ${result.playerInfo.firstName} ${result.playerInfo.lastName} (${result.playerInfo.email || 'No email'})`);
        }
      } else {
        console.log(`   ❌ ERROR: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ EXCEPTION: ${error.message}`);
    }
  }
};

// Run the test
testNameOnlyAccess().catch(console.error);
