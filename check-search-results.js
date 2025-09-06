#!/usr/bin/env node

/**
 * Check if search results are loading properly
 */

import puppeteer from 'puppeteer';

async function checkSearchResults() {
  let browser = null;
  try {
    console.log('🔍 Checking Search Results');
    console.log('==========================\n');

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('🌐 Going to FargoRate...');
    await page.goto('http://fairmatch.fargorate.com', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Searching for Tom Barnard...');
    
    // Type in search box
    await page.type('input[placeholder="Player name or id"]', 'Tom Barnard');
    
    // Click the lookup button
    await page.evaluate(() => {
      const button = document.querySelector('button[id="searchPlayer-2"]');
      if (button) {
        button.click();
      }
    });
    
    console.log('⏳ Waiting for results...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Check what's on the page
    const pageText = await page.evaluate(() => document.body.textContent);
    
    console.log('📄 Page analysis:');
    console.log(`Total characters: ${pageText.length}`);
    
    // Look for key indicators
    const indicators = [
      'Tom',
      'Barnard', 
      '514',
      'Official Rating',
      'CO',
      'Robustness'
    ];
    
    indicators.forEach(indicator => {
      if (pageText.includes(indicator)) {
        console.log(`✅ Found: "${indicator}"`);
      } else {
        console.log(`❌ Missing: "${indicator}"`);
      }
    });
    
    // Check if the search input still has the text
    const searchValue = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Player name or id"]');
      return input ? input.value : '';
    });
    
    console.log(`\n🔍 Search input value: "${searchValue}"`);
    
    // Check if there are any error messages
    const errorText = pageText.toLowerCase();
    if (errorText.includes('error') || errorText.includes('not found') || errorText.includes('no results')) {
      console.log('⚠️ Possible error messages found on page');
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the check
checkSearchResults().catch(console.error);
