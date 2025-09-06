#!/usr/bin/env node

/**
 * Test the new scraper from scratch
 */

import fargoScraperServiceNew from './src/services/fargoScraperServiceNew.js';

async function testNewScraper() {
  try {
    console.log('🧪 Testing New Scraper from Scratch');
    console.log('===================================\n');

    // Test with a different player first to avoid hitting the same name too much
    console.log('🔍 Testing with a different player first...');
    const testResult = await fargoScraperServiceNew.testScraper('John', 'Smith');
    
    if (testResult) {
      console.log(`✅ Test successful: Found ${testResult.name} with rating ${testResult.rating}`);
    } else {
      console.log('⚠️ Test player not found, but that\'s okay - continuing with Tom Barnard');
    }

    // Wait a moment to be respectful to the server
    console.log('\n⏳ Waiting 5 seconds before testing Tom Barnard...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Now test with Tom Barnard
    console.log('\n🔍 Testing with Tom Barnard...');
    const tomResult = await fargoScraperServiceNew.testScraper('Tom', 'Barnard');
    
    if (tomResult) {
      console.log(`\n✅ SUCCESS! Found Tom Barnard:`);
      console.log(`   Name: ${tomResult.name}`);
      console.log(`   Rating: ${tomResult.rating}`);
      console.log(`   Source: ${tomResult.source}`);
      
      if (tomResult.rating === 514) {
        console.log('\n🎉 PERFECT! Found the correct rating (514)!');
      } else {
        console.log(`\n⚠️ Found rating ${tomResult.rating}, but expected 514`);
      }
    } else {
      console.log('\n❌ FAILED: Could not find Tom Barnard');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testNewScraper().catch(console.error);
