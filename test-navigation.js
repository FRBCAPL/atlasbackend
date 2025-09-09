#!/usr/bin/env node

/**
 * Test navigating to the search section first
 */

import puppeteer from 'puppeteer';

async function testNavigation() {
  let browser = null;
  try {
    console.log('🔍 Test: Navigation to Search Section');
    console.log('====================================\n');

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

    // Try clicking the "Search for Players" button first
    console.log('🔍 Clicking "Search for Players" button...');
    await page.evaluate(() => {
      const button = document.querySelector('#go-to-search-btn');
      if (button) {
        button.click();
      }
    });
    
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Now searching for Tom Barnard...');
    
    // Use the correct input ID: searchText-2
    await page.evaluate((term) => {
      const input = document.querySelector('#searchText-2');
      if (input) {
        input.value = '';
        input.focus();
        input.value = term;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 'Tom Barnard');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try the searchPlayer button
    console.log('🔍 Clicking search button...');
    await page.evaluate(() => {
      const button = document.querySelector('#searchPlayer');
      if (button) {
        button.click();
      }
    });
    
    console.log('⏳ Waiting 20 seconds for results...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    // Check the table content
    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('#customListResults');
      return table ? table.textContent : '';
    });
    
    console.log(`📊 Table content: "${tableContent.trim()}"`);
    
    // Check if we found anything
    if (tableContent.includes('Tom') || tableContent.includes('Barnard') || tableContent.includes('514')) {
      console.log('✅ Found relevant content!');
    } else {
      console.log('❌ No relevant content found');
      
      // Check the page URL to see if we navigated somewhere
      const currentUrl = await page.url();
      console.log(`🌐 Current URL: ${currentUrl}`);
      
      // Check if there are any error messages or different content
      const pageText = await page.evaluate(() => document.body.textContent);
      console.log(`📄 Page text length: ${pageText.length}`);
      
      // Look for any error messages
      if (pageText.includes('error') || pageText.includes('Error') || pageText.includes('not found')) {
        console.log('⚠️ Possible error messages found on page');
      }
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
testNavigation().catch(console.error);


