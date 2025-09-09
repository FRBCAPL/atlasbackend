#!/usr/bin/env node

/**
 * Test if the search is working at all
 */

import puppeteer from 'puppeteer';

async function testSearchWorking() {
  let browser = null;
  try {
    console.log('🔍 Test: Is the Search Working?');
    console.log('===============================\n');

    browser = await puppeteer.launch({
      headless: false, // Show browser so we can see what's happening
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('🌐 Going to FargoRate...');
    await page.goto('http://fairmatch.fargorate.com', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔍 Searching for Tom Barnard...');
    
    // Type in search box
    await page.type('input[placeholder="Player name or id"]', 'Tom Barnard');
    
    console.log('⏳ Waiting 5 seconds before clicking...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Click the lookup button
    await page.evaluate(() => {
      const button = document.querySelector('button[id="searchPlayer-2"]');
      if (button) {
        console.log('Button found, clicking...');
        button.click();
      } else {
        console.log('Button not found!');
      }
    });
    
    console.log('⏳ Waiting 20 seconds for results...');
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'search-results.png' });
    console.log('📸 Screenshot saved as search-results.png');

    // Get the page text
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

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testSearchWorking().catch(console.error);



