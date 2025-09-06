#!/usr/bin/env node

/**
 * Test different search approaches
 */

import puppeteer from 'puppeteer';

async function testDifferentSearch() {
  let browser = null;
  try {
    console.log('🔍 Test: Different Search Approaches');
    console.log('===================================\n');

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

    // Try different search approaches
    const searchTerms = [
      'Tom Barnard',
      'Barnard',
      'Tom',
      '9900006862002' // Tom's ID from the image
    ];

    for (let i = 0; i < searchTerms.length; i++) {
      const searchTerm = searchTerms[i];
      console.log(`\n🔍 Testing search term ${i + 1}/${searchTerms.length}: "${searchTerm}"`);
      
      // Clear and type the search term
      await page.evaluate((term) => {
        const input = document.querySelector('input[placeholder="Player name or id"]');
        if (input) {
          input.value = '';
          input.focus();
          input.value = term;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, searchTerm);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Click the search button
      await page.evaluate(() => {
        const button = document.querySelector('button[id="searchPlayer-2"]');
        if (button) {
          button.click();
        }
      });
      
      console.log('⏳ Waiting 15 seconds for results...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      // Check the table content
      const tableContent = await page.evaluate(() => {
        const table = document.querySelector('#customListResults');
        return table ? table.textContent : '';
      });
      
      console.log(`📊 Table content: "${tableContent.trim()}"`);
      
      // Check if we found anything
      if (tableContent.includes('Tom') || tableContent.includes('Barnard') || tableContent.includes('514')) {
        console.log('✅ Found relevant content!');
        break;
      } else {
        console.log('❌ No relevant content found');
      }
      
      // Wait between searches
      if (i < searchTerms.length - 1) {
        console.log('⏳ Waiting 5 seconds before next search...');
        await new Promise(resolve => setTimeout(resolve, 5000));
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
testDifferentSearch().catch(console.error);
