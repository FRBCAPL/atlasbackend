#!/usr/bin/env node

/**
 * Test with a more common player name
 */

import puppeteer from 'puppeteer';

async function testCommonPlayer() {
  let browser = null;
  try {
    console.log('🧪 Testing with Common Player Names');
    console.log('===================================\n');

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    await page.goto('http://fairmatch.fargorate.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test with different common names
    const testNames = [
      'John Smith',
      'Mike Johnson', 
      'David Wilson',
      'Chris',
      'Smith',
      'Johnson'
    ];

    for (const name of testNames) {
      console.log(`\n🔍 Testing: "${name}"`);
      
      // Set search term
      await page.evaluate((selector, value) => {
        const element = document.querySelector(selector);
        if (element) {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 'input[placeholder="Player name or id"]', name);

      // Click search
      const searchButton = await page.$('button[type="submit"]');
      if (searchButton) {
        await searchButton.click();
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if we found results
      const pageContent = await page.content();
      const hasPlayerData = pageContent.includes('Official Rating') && 
                           pageContent.includes('Player') &&
                           !pageContent.includes('No results') &&
                           !pageContent.includes('not found');

      if (hasPlayerData) {
        console.log(`✅ Found results for "${name}"`);
        
        // Look for actual player names in the content
        const playerMatches = pageContent.match(/[A-Z][a-z]+ [A-Z][a-z]+/g);
        if (playerMatches) {
          console.log(`   Player names found: ${playerMatches.slice(0, 5).join(', ')}`);
        }
        
        // Look for ratings
        const ratings = pageContent.match(/\b\d{3,4}\b/g);
        if (ratings) {
          const validRatings = ratings.filter(r => parseInt(r) >= 200 && parseInt(r) <= 900);
          if (validRatings.length > 0) {
            console.log(`   Valid ratings found: ${validRatings.slice(0, 5).join(', ')}`);
          }
        }
      } else {
        console.log(`❌ No results for "${name}"`);
      }
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testCommonPlayer().catch(console.error);



