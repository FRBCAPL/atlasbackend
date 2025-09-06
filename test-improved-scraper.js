#!/usr/bin/env node

/**
 * Test the improved scraper with better rating extraction
 */

import fargoScraperServiceNew from './src/services/fargoScraperServiceNew.js';

async function testImprovedScraper() {
  try {
    console.log('🧪 Testing Improved Scraper');
    console.log('===========================\n');

    // Test with Tom Barnard to see if we can get the correct rating (514)
    console.log('🔍 Testing with Tom Barnard...');
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
        console.log('   The scraper is still not finding the correct rating.');
      }
    } else {
      console.log('\n❌ FAILED: Could not find Tom Barnard');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testImprovedScraper().catch(console.error);
