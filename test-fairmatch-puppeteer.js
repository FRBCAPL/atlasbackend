#!/usr/bin/env node

/**
 * Test FairMatch with Puppeteer
 */

import puppeteer from 'puppeteer';

async function testFairMatchPuppeteer() {
  let browser = null;
  try {
    console.log('🔍 Testing FairMatch with Puppeteer');
    console.log('===================================\n');

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
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

    console.log('✅ FairMatch page loaded');
    
    const title = await page.title();
    console.log(`📄 Title: ${title}`);

    // Wait a bit for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Take a screenshot for debugging
    await page.screenshot({ path: 'fairmatch-screenshot.png' });
    console.log('📸 Screenshot saved as fairmatch-screenshot.png');

    // Look for input fields
    const inputs = await page.$$('input');
    console.log(`⌨️ Found ${inputs.length} input fields`);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await page.evaluate(el => el.type, input);
      const name = await page.evaluate(el => el.name, input);
      const placeholder = await page.evaluate(el => el.placeholder, input);
      console.log(`   Input ${i + 1}: ${type} - ${name} - "${placeholder}"`);
    }

    // Look for buttons
    const buttons = await page.$$('button');
    console.log(`🔘 Found ${buttons.length} buttons`);

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await page.evaluate(el => el.textContent, button);
      const type = await page.evaluate(el => el.type, button);
      console.log(`   Button ${i + 1}: ${type} - "${text.trim()}"`);
    }

    // Try to find any text that might indicate search functionality
    const bodyText = await page.evaluate(() => document.body.textContent);
    const searchKeywords = ['search', 'player', 'rating', 'fargo', 'lookup', 'find'];
    
    console.log('🔍 Searching for keywords in page content:');
    searchKeywords.forEach(keyword => {
      const count = (bodyText.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      if (count > 0) {
        console.log(`   "${keyword}": ${count} occurrences`);
      }
    });

    console.log('\n✅ FairMatch Puppeteer test completed!');

  } catch (error) {
    console.error('❌ FairMatch test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Run the test
testFairMatchPuppeteer().catch(console.error);
