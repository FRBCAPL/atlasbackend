#!/usr/bin/env node

/**
 * Check what the search page actually looks like
 */

import puppeteer from 'puppeteer';

async function checkSearchPage() {
  let browser = null;
  try {
    console.log('🔍 Checking Search Page Structure');
    console.log('=================================\n');

    browser = await puppeteer.launch({
      headless: false, // Run in visible mode to see what's happening
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    console.log('Navigating to FairMatch...');
    await page.goto('http://fairmatch.fargorate.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Taking screenshot of initial page...');
    await page.screenshot({ path: 'initial-page.png' });

    // Check if we need to log in
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('🔐 Login form detected - we may need to log in first');
    }

    // Look for any search functionality
    const searchInputs = await page.$$('input');
    console.log(`\n⌨️ Found ${searchInputs.length} input fields:`);
    
    for (let i = 0; i < searchInputs.length; i++) {
      const input = searchInputs[i];
      const type = await page.evaluate(el => el.type, input);
      const name = await page.evaluate(el => el.name, input);
      const placeholder = await page.evaluate(el => el.placeholder, input);
      const id = await page.evaluate(el => el.id, input);
      console.log(`   Input ${i + 1}: ${type} - ${name} - "${placeholder}" - ${id}`);
    }

    // Check if there are any visible search buttons or links
    const buttons = await page.$$('button, a');
    console.log(`\n🔘 Found ${buttons.length} buttons/links:`);
    
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const button = buttons[i];
      const text = await page.evaluate(el => el.textContent, button);
      const tagName = await page.evaluate(el => el.tagName, button);
      console.log(`   ${tagName} ${i + 1}: "${text.trim()}"`);
    }

    // Check the page URL and title
    const url = page.url();
    const title = await page.title();
    console.log(`\n📄 Current URL: ${url}`);
    console.log(`📄 Page Title: ${title}`);

    // Look for any text that mentions search or lookup
    const bodyText = await page.evaluate(() => document.body.textContent);
    const searchKeywords = ['search', 'lookup', 'find', 'player', 'rating'];
    
    console.log('\n🔍 Keywords found on page:');
    searchKeywords.forEach(keyword => {
      const count = (bodyText.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      if (count > 0) {
        console.log(`   "${keyword}": ${count} occurrences`);
      }
    });

    console.log('\n⏳ Waiting 10 seconds for you to see the page...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n✅ Page analysis completed!');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the analysis
checkSearchPage().catch(console.error);



