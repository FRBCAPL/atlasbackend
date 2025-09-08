#!/usr/bin/env node

/**
 * Simple check for rating 514
 */

import puppeteer from 'puppeteer';

async function simple514Check() {
  let browser = null;
  try {
    console.log('🔍 Simple 514 Check');
    console.log('===================\n');

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

    // Check if 514 is on the page
    const has514 = await page.evaluate(() => {
      return document.body.textContent.includes('514');
    });
    
    if (has514) {
      console.log('✅ SUCCESS! Rating 514 found on the page!');
      
      // Get the HTML to see the structure
      const html = await page.content();
      const ratingIndex = html.indexOf('514');
      const context = html.substring(Math.max(0, ratingIndex - 200), ratingIndex + 200);
      console.log(`Context around 514: ${context}`);
      
    } else {
      console.log('❌ Rating 514 not found on page');
      
      // Check what's actually on the page
      const pageText = await page.evaluate(() => document.body.textContent);
      console.log(`Page text length: ${pageText.length}`);
      
      // Look for any 3-4 digit numbers
      const numbers = pageText.match(/\b\d{3,4}\b/g);
      if (numbers) {
        const ratings = numbers.filter(n => parseInt(n) >= 200 && parseInt(n) <= 900);
        console.log(`Found ratings: ${ratings.join(', ')}`);
      }
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
simple514Check().catch(console.error);


