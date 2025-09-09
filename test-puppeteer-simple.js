#!/usr/bin/env node

/**
 * Simple Puppeteer test to verify it's working
 */

import puppeteer from 'puppeteer';

async function testPuppeteer() {
  let browser = null;
  try {
    console.log('🧪 Testing Puppeteer Installation');
    console.log('==================================\n');

    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    console.log('✅ Browser launched successfully');

    const page = await browser.newPage();
    console.log('✅ New page created');

    console.log('Navigating to Google...');
    await page.goto('https://www.google.com', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });

    const title = await page.title();
    console.log(`✅ Page loaded: ${title}`);

    console.log('✅ Puppeteer is working correctly!');

  } catch (error) {
    console.error('❌ Puppeteer test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Run the test
testPuppeteer().catch(console.error);



