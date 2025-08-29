import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:8080';

const testUnifiedAccess = async () => {
  console.log('🧪 Testing Unified Access Endpoint\n');

  const testCases = [
    {
      name: 'Test with email only',
      data: { email: 'test@example.com' },
      description: 'Should find player by email'
    },
    {
      name: 'Test with PIN only',
      data: { pin: '1234' },
      description: 'Should find player by PIN'
    },
    {
      name: 'Test with both email and PIN',
      data: { email: 'test@example.com', pin: '1234' },
      description: 'Should find player by email first'
    },
    {
      name: 'Test with no input',
      data: {},
      description: 'Should return error for missing input'
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
      console.log(`   Response: ${JSON.stringify(result, null, 2)}`);

      if (response.ok && result.success) {
        console.log(`   ✅ SUCCESS: Player type = ${result.playerType}, Message = ${result.message}`);
      } else {
        console.log(`   ❌ ERROR: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ EXCEPTION: ${error.message}`);
    }
  }
};

// Run the test
testUnifiedAccess().catch(console.error);
