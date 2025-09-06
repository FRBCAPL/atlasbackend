#!/usr/bin/env node

/**
 * Quick test to find rating 514 on FargoRate
 */

import puppeteer from 'puppeteer';

async function quick514Test() {
  let browser = null;
  try {
    console.log('🔍 Quick Test: Looking for Rating 514');
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

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Searching for Tom Barnard...');
    
    // Type in search box
    await page.type('input[placeholder="Player name or id"]', 'Tom Barnard');
    
    // Click the lookup button using different approach
    await page.evaluate(() => {
      const button = document.querySelector('button[id="searchPlayer-2"]');
      if (button) {
        button.click();
      }
    });
    
    console.log('⏳ Waiting for results...');
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait longer

    // Check if 514 is anywhere on the page
    const has514 = await page.evaluate(() => {
      return document.body.textContent.includes('514');
    });
    
    if (has514) {
      console.log('✅ SUCCESS! Rating 514 found on the page!');
      
      // Get the HTML content to see the structure
      const html = await page.content();
      const ratingIndex = html.indexOf('514');
      const context = html.substring(Math.max(0, ratingIndex - 100), ratingIndex + 100);
      console.log(`Context around 514: ${context}`);
      
    } else {
      console.log('❌ Rating 514 not found on page');
      
      // Check what ratings are on the page
      const allNumbers = await page.evaluate(() => {
        const text = document.body.textContent;
        const matches = text.match(/\b\d{3,4}\b/g);
        return matches ? matches.filter(n => parseInt(n) >= 200 && parseInt(n) <= 900) : [];
      });
      
      console.log(`Found ratings on page: ${allNumbers.join(', ')}`);
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
quick514Test().catch(console.error);
