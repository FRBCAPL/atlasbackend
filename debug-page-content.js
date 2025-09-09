#!/usr/bin/env node

/**
 * Debug what's actually on the page after searching
 */

import puppeteer from 'puppeteer';

async function debugPageContent() {
  let browser = null;
  try {
    console.log('🔍 Debug: What\'s Actually on the Page');
    console.log('=====================================\n');

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

    // Get the full page text
    const pageText = await page.evaluate(() => document.body.textContent);
    
    console.log('📄 Page content analysis:');
    console.log(`Total characters: ${pageText.length}`);
    
    // Look for Tom Barnard
    if (pageText.includes('Tom') && pageText.includes('Barnard')) {
      console.log('✅ Found "Tom" and "Barnard" on page');
    } else {
      console.log('❌ "Tom" and "Barnard" not found on page');
    }
    
    // Look for specific text patterns
    const patterns = [
      'Barnard, Tom',
      'Tom Barnard',
      'Official Rating',
      '514',
      'CO',
      'Robustness'
    ];
    
    console.log('\n🔍 Pattern analysis:');
    patterns.forEach(pattern => {
      if (pageText.includes(pattern)) {
        console.log(`✅ Found: "${pattern}"`);
      } else {
        console.log(`❌ Missing: "${pattern}"`);
      }
    });
    
    // Look for any 3-4 digit numbers
    const numbers = pageText.match(/\b\d{3,4}\b/g);
    if (numbers) {
      const ratings = numbers.filter(n => parseInt(n) >= 200 && parseInt(n) <= 900);
      console.log(`\n📊 Found ratings: ${ratings.join(', ')}`);
    }
    
    // Check if the search input still has the text
    const searchValue = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Player name or id"]');
      return input ? input.value : '';
    });
    
    console.log(`\n🔍 Search input value: "${searchValue}"`);
    
    // Check if there are any error messages
    const errorText = pageText.toLowerCase();
    if (errorText.includes('error') || errorText.includes('not found') || errorText.includes('no results')) {
      console.log('⚠️ Possible error messages found on page');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the debug
debugPageContent().catch(console.error);



