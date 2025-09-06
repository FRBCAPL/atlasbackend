#!/usr/bin/env node

/**
 * Test specific search for Tom Barnard's rating
 */

import puppeteer from 'puppeteer';

async function testSpecificSearch() {
  let browser = null;
  try {
    console.log('🔍 Testing Specific Search for Tom Barnard');
    console.log('==========================================\n');

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    console.log('🌐 Going to FargoRate...');
    await page.goto('http://fairmatch.fargorate.com', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔍 Searching for Tom Barnard...');
    
    // Type in search box
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Player name or id"]');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
    
    await page.type('input[placeholder="Player name or id"]', 'Tom Barnard');
    
    // Click the lookup button
    await page.click('button[id="searchPlayer-2"]');
    
    console.log('⏳ Waiting for search results...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Get the page content and look specifically for Tom Barnard's rating
    const pageContent = await page.evaluate(() => document.body.textContent);
    
    console.log('🔍 Analyzing page content for Tom Barnard...');
    
    // Look for the specific pattern: "Barnard, Tom" followed by a rating
    const barnardMatch = pageContent.match(/Barnard[^0-9]*(\d{3,4})/i);
    if (barnardMatch) {
      console.log(`✅ Found Tom Barnard with rating: ${barnardMatch[1]}`);
    } else {
      console.log('❌ Tom Barnard pattern not found');
    }
    
    // Look for "514" specifically
    if (pageContent.includes('514')) {
      console.log('✅ Found rating 514 on the page!');
      
      // Get context around the 514
      const lines = pageContent.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('514')) {
          console.log(`   Line with 514: "${lines[i].trim()}"`);
          if (i > 0) console.log(`   Before: "${lines[i-1].trim()}"`);
          if (i < lines.length - 1) console.log(`   After: "${lines[i+1].trim()}"`);
          break;
        }
      }
    } else {
      console.log('❌ Rating 514 not found on page');
    }
    
    // Look for "Official Rating" followed by a number
    const officialRatingMatch = pageContent.match(/Official Rating[^0-9]*(\d{3,4})/i);
    if (officialRatingMatch) {
      console.log(`✅ Found Official Rating: ${officialRatingMatch[1]}`);
    } else {
      console.log('❌ Official Rating pattern not found');
    }
    
    // Check if the table has any content
    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('#customListResults');
      return table ? table.textContent : '';
    });
    
    console.log(`\n📊 Table content: "${tableContent.substring(0, 200)}..."`);
    
    if (tableContent.includes('514')) {
      console.log('✅ Rating 514 found in table!');
    } else {
      console.log('❌ Rating 514 not found in table');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testSpecificSearch().catch(console.error);

