#!/usr/bin/env node

/**
 * Simple API Testing Script for New Bylaw
 * 
 * Tests the API endpoints directly to verify the new bylaw functionality
 */

const BASE_URL = 'http://localhost:8080';

async function testAPI(endpoint, method = 'GET', data = null) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    console.log(`\n🔗 Testing: ${method} ${endpoint}`);
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(result, null, 2));
    
    return { success: response.ok, data: result };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAPITests() {
  console.log('🚀 Starting API Tests for New Bylaw...');
  console.log('=====================================');

  const testPlayer = 'Mark Slam';
  const testDivision = 'FRBCAPL TEST';

  // Test 1: Get Challenge Stats
  console.log('\n📊 Test 1: Get Challenge Stats');
  await testAPI(`/api/challenges/stats/${encodeURIComponent(testPlayer)}/${encodeURIComponent(testDivision)}`);

  // Test 2: Get Challenge Limits
  console.log('\n📊 Test 2: Get Challenge Limits');
  await testAPI(`/api/challenges/limits/${encodeURIComponent(testPlayer)}/${encodeURIComponent(testDivision)}`);

  // Test 3: Get Eligible Opponents
  console.log('\n📊 Test 3: Get Eligible Opponents');
  await testAPI(`/api/challenges/eligible-opponents/${encodeURIComponent(testPlayer)}/${encodeURIComponent(testDivision)}`);

  // Test 4: Validate Challenge
  console.log('\n📊 Test 4: Validate Challenge');
  await testAPI('/api/challenges/validate', 'POST', {
    senderName: testPlayer,
    receiverName: 'Randy Fishburn',
    division: testDivision
  });

  // Test 5: Validate Defense Acceptance
  console.log('\n📊 Test 5: Validate Defense Acceptance');
  await testAPI('/api/challenges/validate-defense', 'POST', {
    defenderName: testPlayer,
    challengerName: 'Randy Fishburn',
    division: testDivision
  });

  console.log('\n✅ API Tests Completed!');
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Fetch is not available. Please use Node.js 18+ or install node-fetch.');
  process.exit(1);
}

runAPITests().catch(console.error); 