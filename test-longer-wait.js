#!/usr/bin/env node

/**
 * Test with longer wait times to see if results load
 */

import puppeteer from 'puppeteer';

async function testLongerWait() {
  let browser = null;
  try {
    console.log('🔍 Test: Longer Wait for Results');
    console.log('=================================\n');

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

    await new Promise(resolve => setTimeout(resolve, 5000));

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
    
    console.log('⏳ Waiting 30 seconds for results...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Check the table content after longer wait
    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('#customListResults');
      return table ? table.textContent : '';
    });
    
    console.log(`📊 Table content after 30 seconds: "${tableContent}"`);
    
    // Check if there are any error messages
    const errorMessages = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], [class*="warning"], [class*="Warning"]');
      return Array.from(errorElements).map(el => el.textContent).filter(text => text.trim().length > 0);
    });
    
    if (errorMessages.length > 0) {
      console.log('⚠️ Error messages found:');
      errorMessages.forEach(msg => console.log(`   ${msg}`));
    } else {
      console.log('✅ No error messages found');
    }
    
    // Check if the search input still has the value
    const searchValue = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Player name or id"]');
      return input ? input.value : '';
    });
    
    console.log(`🔍 Search input value: "${searchValue}"`);
    
    // Look for any loading indicators
    const loadingElements = await page.evaluate(() => {
      const loading = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
      return loading.length > 0;
    });
    
    console.log(`⏳ Loading indicators present: ${loadingElements}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testLongerWait().catch(console.error);

