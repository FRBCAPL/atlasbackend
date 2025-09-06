#!/usr/bin/env node

/**
 * Test the FairMatch FargoRate player search system
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFairMatch() {
  try {
    console.log('🔍 Testing FairMatch FargoRate Player Search');
    console.log('============================================\n');

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

    // Test 1: Check FairMatch main page
    console.log('1. Testing FairMatch main page...');
    try {
      const response = await axios.get('http://fairmatch.fargorate.com', {
        headers: { 'User-Agent': userAgent },
        timeout: 10000
      });
      
      console.log(`✅ Status: ${response.status}`);
      
      const $ = cheerio.load(response.data);
      console.log(`📄 Title: ${$('title').text()}`);
      
      // Look for search forms
      const forms = $('form');
      console.log(`📝 Found ${forms.length} forms`);
      
      forms.each((i, form) => {
        const action = $(form).attr('action') || 'current page';
        const method = $(form).attr('method') || 'GET';
        console.log(`   Form ${i + 1}: ${method} -> ${action}`);
        
        // Look for input fields in this form
        const inputs = $(form).find('input');
        inputs.each((j, input) => {
          const type = $(input).attr('type') || 'text';
          const name = $(input).attr('name') || 'unnamed';
          const placeholder = $(input).attr('placeholder') || '';
          console.log(`     Input: ${type} - ${name} - "${placeholder}"`);
        });
      });
      
      // Look for any search-related links
      const searchLinks = $('a[href*="search"], a[href*="player"], a[href*="lookup"]');
      console.log(`🔗 Found ${searchLinks.length} search-related links:`);
      searchLinks.each((i, link) => {
        const href = $(link).attr('href');
        const text = $(link).text().trim();
        console.log(`   ${text} -> ${href}`);
      });
      
    } catch (error) {
      console.log(`❌ FairMatch main page error: ${error.message}`);
    }

    // Test 2: Try different FairMatch URLs
    console.log('\n2. Testing potential FairMatch endpoints...');
    const fairmatchUrls = [
      'http://fairmatch.fargorate.com/search',
      'http://fairmatch.fargorate.com/players',
      'http://fairmatch.fargorate.com/lookup',
      'http://fairmatch.fargorate.com/player-search',
      'http://fairmatch.fargorate.com/database'
    ];

    for (const url of fairmatchUrls) {
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': userAgent },
          timeout: 5000
        });
        console.log(`✅ ${url}: ${response.status}`);
        
        const $ = cheerio.load(response.data);
        const title = $('title').text();
        console.log(`   Title: ${title}`);
        
      } catch (error) {
        console.log(`❌ ${url}: ${error.message}`);
      }
    }

    // Test 3: Try searching with parameters
    console.log('\n3. Testing search with parameters...');
    const searchUrls = [
      'http://fairmatch.fargorate.com/search?q=Brett',
      'http://fairmatch.fargorate.com/search?name=Brett%20Gonzalez',
      'http://fairmatch.fargorate.com/players?search=Brett',
      'http://fairmatch.fargorate.com/lookup?player=Brett%20Gonzalez'
    ];

    for (const url of searchUrls) {
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': userAgent },
          timeout: 5000
        });
        console.log(`✅ ${url}: ${response.status}`);
        
        const $ = cheerio.load(response.data);
        const content = $('body').text().substring(0, 300);
        console.log(`   Content preview: ${content}...`);
        
        // Look for player data in the response
        const playerElements = $('*:contains("Brett"), *:contains("Gonzalez"), *:contains("rating"), *:contains("fargo")');
        if (playerElements.length > 0) {
          console.log(`   🎯 Found ${playerElements.length} player-related elements!`);
        }
        
      } catch (error) {
        console.log(`❌ ${url}: ${error.message}`);
      }
    }

    console.log('\n🎯 FairMatch Investigation Complete!');
    console.log('\nNext steps:');
    console.log('1. Review the results above');
    console.log('2. Identify the correct search endpoint');
    console.log('3. Update the scraper to use FairMatch');
    console.log('4. Test with actual player searches');

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

// Run the investigation
testFairMatch().catch(console.error);

