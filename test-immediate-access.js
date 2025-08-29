import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:8080';

const testImmediateAccess = async () => {
  console.log('🧪 Testing Immediate Access Functionality\n');

  // Test with a real player that should exist in the database
  const testCases = [
    {
      name: 'Test immediate access with correct name and email',
      data: { 
        firstName: 'Mark', 
        lastName: 'Slam', 
        email: 'frbcapl@gmail.com' 
      },
      description: 'Should grant immediate access to Mark Slam'
    },
    {
      name: 'Test immediate access with correct name and PIN',
      data: { 
        firstName: 'Mark', 
        lastName: 'Slam', 
        pin: '777777' 
      },
      description: 'Should grant immediate access to Mark Slam via PIN'
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
          console.log(`   👤 Player Info: ${result.playerInfo.firstName} ${result.playerInfo.lastName} (${result.playerInfo.email})`);
        }
        if (result.leagueInfo) {
          console.log(`   🏆 League Info: Available`);
        }
        if (result.ladderInfo) {
          console.log(`   📈 Ladder Info: Position ${result.ladderInfo.position} in ${result.ladderInfo.ladderName}`);
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
testImmediateAccess().catch(console.error);
