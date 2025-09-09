#!/usr/bin/env node

/**
 * Test different search approaches to avoid the error
 */

import puppeteer from 'puppeteer';

async function testDifferentSearchApproach() {
  let browser = null;
  try {
    console.log('🔍 Test: Different Search Approach');
    console.log('==================================\n');

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

    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer

    // Try different search approaches
    const searchApproaches = [
      { name: 'Full Name', term: 'Tom Barnard' },
      { name: 'Last Name Only', term: 'Barnard' },
      { name: 'First Name Only', term: 'Tom' }
    ];

    for (let i = 0; i < searchApproaches.length; i++) {
      const approach = searchApproaches[i];
      console.log(`\n🔍 Testing approach ${i + 1}/${searchApproaches.length}: ${approach.name} - "${approach.term}"`);
      
      // Clear the input and type the search term
      await page.evaluate((term) => {
        const input = document.querySelector('#searchText-2');
        if (input) {
          input.value = '';
          input.focus();
          input.value = term;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, approach.term);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Click the search button
      await page.evaluate(() => {
        const button = document.querySelector('#searchPlayer-2');
        if (button) {
          button.click();
        }
      });
      
      console.log('⏳ Waiting 20 seconds for results...');
      await new Promise(resolve => setTimeout(resolve, 20000));
      
      // Check the table content
      const tableContent = await page.evaluate(() => {
        const table = document.querySelector('#searchResults-2');
        return table ? table.textContent : '';
      });
      
      console.log(`📊 Table content: "${tableContent.trim()}"`);
      
      // Check if we got an error or actual results
      if (tableContent.includes('An error occurred')) {
        console.log('❌ Search failed with error');
      } else if (tableContent.includes('Tom') || tableContent.includes('Barnard')) {
        console.log('✅ Found player data!');
        
        // Look for ratings
        const numbers = tableContent.match(/\b\d{3,4}\b/g);
        if (numbers) {
          const ratings = numbers.filter(n => parseInt(n) >= 200 && parseInt(n) <= 900);
          console.log(`📊 Found ratings: ${ratings.join(', ')}`);
        }
        break; // Stop if we found results
      } else {
        console.log('❌ No player data found');
      }
      
      // Wait between different approaches
      if (i < searchApproaches.length - 1) {
        console.log('⏳ Waiting 30 seconds before next approach...');
        await new Promise(resolve => setTimeout(resolve, 30000));
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
testDifferentSearchApproach().catch(console.error);


