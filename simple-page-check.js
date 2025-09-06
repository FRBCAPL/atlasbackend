#!/usr/bin/env node

/**
 * Simple check to see what's on the FargoRate page
 */

import puppeteer from 'puppeteer';

async function simplePageCheck() {
  let browser = null;
  try {
    console.log('🔍 Simple Page Check');
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

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📄 Checking page content...');
    
    // Get the page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Check if the search input exists
    const searchInput = await page.$('input[placeholder="Player name or id"]');
    console.log(`Search input found: ${searchInput ? 'Yes' : 'No'}`);
    
    // Check if the search button exists
    const searchButton = await page.$('button[id="searchPlayer-2"]');
    console.log(`Search button found: ${searchButton ? 'Yes' : 'No'}`);
    
    // Get the page text
    const pageText = await page.evaluate(() => document.body.textContent);
    console.log(`Page text length: ${pageText.length}`);
    
    // Look for key words
    const keywords = ['FargoRate', 'FairMatch', 'Search', 'Player', 'Rating'];
    keywords.forEach(keyword => {
      if (pageText.includes(keyword)) {
        console.log(`✅ Found: "${keyword}"`);
      } else {
        console.log(`❌ Missing: "${keyword}"`);
      }
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the check
simplePageCheck().catch(console.error);
