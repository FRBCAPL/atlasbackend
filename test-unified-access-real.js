import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:8080';

const testUnifiedAccessReal = async () => {
  console.log('🧪 Testing Unified Access Endpoint with Real Data\n');

  // Test with a real player that should exist in the database
  const testCases = [
    {
      name: 'Test with real email',
      data: { email: 'frbcapl@gmail.com' }, // Mark Slam's email
      description: 'Should find Mark Slam by email'
    },
    {
      name: 'Test with real PIN',
      data: { pin: '777777' }, // Mark Slam's PIN
      description: 'Should find Mark Slam by PIN'
    },
    {
      name: 'Test with both real email and PIN',
      data: { email: 'frbcapl@gmail.com', pin: '777777' },
      description: 'Should find Mark Slam by email first'
    },
    {
      name: 'Test with invalid email',
      data: { email: 'nonexistent@example.com' },
      description: 'Should return 404 for non-existent email'
    },
    {
      name: 'Test with invalid PIN',
      data: { pin: '9999' },
      description: 'Should return 404 for non-existent PIN'
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
        if (result.leagueInfo) {
          console.log(`   🏆 League Info: Available`);
        }
        if (result.ladderInfo) {
          console.log(`   🏅 Ladder Info: Position ${result.ladderInfo.position}, Fargo ${result.ladderInfo.fargoRate}`);
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
testUnifiedAccessReal().catch(console.error);
