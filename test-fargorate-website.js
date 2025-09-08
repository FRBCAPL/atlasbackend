#!/usr/bin/env node

/**
 * Test script to investigate FargoRate website structure
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFargoRateWebsite() {
  try {
    console.log('🔍 Investigating FargoRate Website Structure');
    console.log('============================================\n');

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

    // Test 1: Check main website
    console.log('1. Testing main FargoRate website...');
    try {
      const response = await axios.get('https://www.fargorate.com', {
        headers: { 'User-Agent': userAgent },
        timeout: 10000
      });
      console.log(`✅ Main site accessible: ${response.status}`);
      
      const $ = cheerio.load(response.data);
      const title = $('title').text();
      console.log(`   Title: ${title}`);
      
      // Look for search functionality
      const searchForms = $('form').length;
      const searchInputs = $('input[type="search"], input[name*="search"], input[name*="name"]').length;
      console.log(`   Forms found: ${searchForms}`);
      console.log(`   Search inputs found: ${searchInputs}`);
      
    } catch (error) {
      console.log(`❌ Main site error: ${error.message}`);
    }

    // Test 2: Try different search URLs
    const searchUrls = [
      'https://www.fargorate.com/search',
      'https://www.fargorate.com/players',
      'https://www.fargorate.com/lookup',
      'https://www.fargorate.com/database',
      'https://www.fargorate.com/player-search'
    ];

    console.log('\n2. Testing potential search endpoints...');
    for (const url of searchUrls) {
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': userAgent },
          timeout: 5000
        });
        console.log(`✅ ${url}: ${response.status}`);
        
        const $ = cheerio.load(response.data);
        const title = $('title').text();
        console.log(`   Title: ${title}`);
        
        // Look for player-related content
        const playerElements = $('*:contains("player"), *:contains("rating"), *:contains("fargo")').length;
        console.log(`   Player-related elements: ${playerElements}`);
        
      } catch (error) {
        console.log(`❌ ${url}: ${error.message}`);
      }
    }

    // Test 3: Try searching with parameters
    console.log('\n3. Testing search with parameters...');
    const testSearches = [
      'https://www.fargorate.com/search?q=Brett',
      'https://www.fargorate.com/search?first_name=Brett&last_name=Gonzalez',
      'https://www.fargorate.com/players?search=Brett',
      'https://www.fargorate.com/lookup?name=Brett%20Gonzalez'
    ];

    for (const url of testSearches) {
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': userAgent },
          timeout: 5000
        });
        console.log(`✅ ${url}: ${response.status}`);
        
        const $ = cheerio.load(response.data);
        const content = $('body').text().substring(0, 200);
        console.log(`   Content preview: ${content}...`);
        
      } catch (error) {
        console.log(`❌ ${url}: ${error.message}`);
      }
    }

    // Test 4: Check for API endpoints
    console.log('\n4. Testing potential API endpoints...');
    const apiUrls = [
      'https://www.fargorate.com/api/players',
      'https://www.fargorate.com/api/search',
      'https://api.fargorate.com/players',
      'https://www.fargorate.com/data/players.json'
    ];

    for (const url of apiUrls) {
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': userAgent },
          timeout: 5000
        });
        console.log(`✅ ${url}: ${response.status}`);
        console.log(`   Content type: ${response.headers['content-type']}`);
        
      } catch (error) {
        console.log(`❌ ${url}: ${error.message}`);
      }
    }

    console.log('\n🎯 Investigation Complete!');
    console.log('\nNext steps:');
    console.log('1. Review the results above');
    console.log('2. Identify the correct search endpoint');
    console.log('3. Update the scraper with the correct URLs');
    console.log('4. Test with actual player searches');

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

// Run the investigation
testFargoRateWebsite().catch(console.error);


