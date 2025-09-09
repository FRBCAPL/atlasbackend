#!/usr/bin/env node

/**
 * Debug search results to see what we're getting
 */

import puppeteer from 'puppeteer';

async function debugSearchResults() {
  let browser = null;
  try {
    console.log('🔍 Debugging Search Results');
    console.log('===========================\n');

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    console.log('Navigating to FairMatch...');
    await page.goto('http://fairmatch.fargorate.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Setting search term...');
    await page.evaluate((selector, value) => {
      const element = document.querySelector(selector);
      if (element) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 'input[placeholder="Player name or id"]', 'Brett Gonzalez');

    console.log('Clicking search button...');
    const searchButton = await page.$('button[type="submit"]');
    if (searchButton) {
      await searchButton.click();
    }

    console.log('Waiting for results...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get all table rows
    const tableRows = await page.$$('table tr');
    console.log(`\n📊 Found ${tableRows.length} table rows:`);
    
    for (let i = 0; i < tableRows.length; i++) {
      const text = await page.evaluate(el => el.textContent, tableRows[i]);
      console.log(`   Row ${i + 1}: ${text.trim()}`);
    }

    // Get all result elements
    const resultElements = await page.$$('[class*="result"]');
    console.log(`\n🎯 Found ${resultElements.length} result elements:`);
    
    for (let i = 0; i < resultElements.length; i++) {
      const text = await page.evaluate(el => el.textContent, resultElements[i]);
      console.log(`   Result ${i + 1}: ${text.trim()}`);
    }

    // Get page content to look for any player data
    const pageContent = await page.content();
    console.log(`\n📄 Page content length: ${pageContent.length} characters`);
    
    // Look for any numbers that might be ratings
    const numbers = pageContent.match(/\b\d{3,4}\b/g);
    if (numbers) {
      console.log(`\n🔢 Found numbers that might be ratings: ${numbers.join(', ')}`);
    }

    // Look for the search term in the content
    if (pageContent.toLowerCase().includes('brett')) {
      console.log(`\n✅ Found "Brett" in page content`);
    } else {
      console.log(`\n❌ Did not find "Brett" in page content`);
    }

    if (pageContent.toLowerCase().includes('gonzalez')) {
      console.log(`✅ Found "Gonzalez" in page content`);
    } else {
      console.log(`❌ Did not find "Gonzalez" in page content`);
    }

    // Take a screenshot of the results
    await page.screenshot({ path: 'search-results-screenshot.png' });
    console.log('\n📸 Screenshot saved as search-results-screenshot.png');

    console.log('\n✅ Debug completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the debug
debugSearchResults().catch(console.error);



