import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:8080';

const testNameVerification = async () => {
  console.log('🧪 Testing Name Verification in Unified Access Endpoint\n');

  // Test with a real player that should exist in the database
  const testCases = [
    {
      name: 'Test with correct name and email',
      data: { 
        firstName: 'Mark', 
        lastName: 'Slam', 
        email: 'frbcapl@gmail.com' 
      },
      description: 'Should find Mark Slam with correct name and email'
    },
    {
      name: 'Test with correct name and PIN',
      data: { 
        firstName: 'Mark', 
        lastName: 'Slam', 
        pin: '777777' 
      },
      description: 'Should find Mark Slam with correct name and PIN'
    },
    {
      name: 'Test with wrong name but correct email',
      data: { 
        firstName: 'Wrong', 
        lastName: 'Name', 
        email: 'frbcapl@gmail.com' 
      },
      description: 'Should reject due to name mismatch'
    },
    {
      name: 'Test with correct name but wrong email',
      data: { 
        firstName: 'Mark', 
        lastName: 'Slam', 
        email: 'wrong@email.com' 
      },
      description: 'Should reject due to email not found'
    },
    {
      name: 'Test with missing name',
      data: { 
        email: 'frbcapl@gmail.com' 
      },
      description: 'Should reject due to missing name'
    },
    {
      name: 'Test with missing email and PIN',
      data: { 
        firstName: 'Mark', 
        lastName: 'Slam' 
      },
      description: 'Should reject due to missing email and PIN'
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
        console.log(`   ✅ SUCCESS: Player type = ${result.playerType}, Message = ${result.message}`);
        if (result.playerInfo) {
          console.log(`   📋 Player Info: ${result.playerInfo.firstName} ${result.playerInfo.lastName} (${result.playerInfo.email})`);
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
testNameVerification().catch(console.error);
