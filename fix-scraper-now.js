#!/usr/bin/env node

/**
 * Fix the scraper to actually work with FargoRate
 */

import puppeteer from 'puppeteer';

async function fixScraper() {
  let browser = null;
  try {
    console.log('🔧 Fixing FargoRate Scraper');
    console.log('===========================\n');

    browser = await puppeteer.launch({
      headless: false, // Show browser so we can see what's happening
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

    console.log('🌐 Navigating to FargoRate...');
    await page.goto('http://fairmatch.fargorate.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Searching for Tom Barnard...');
    
    // Type in search box
    await page.type('input[placeholder="Player name or id"]', 'Tom Barnard');
    
    // Click lookup button
    await page.click('button[id="searchPlayer-2"]');
    
    console.log('⏳ Waiting for results...');
    
    // Wait much longer for results to load
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Try multiple approaches to find the rating
    console.log('🔍 Looking for rating...');
    
    // Method 1: Look for the specific rating number 514
    const rating514 = await page.$eval('*', (el) => {
      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.trim() === '514') {
          return node.textContent;
        }
      }
      return null;
    });
    
    if (rating514) {
      console.log('✅ Found rating 514!');
    } else {
      console.log('❌ Rating 514 not found');
    }
    
    // Method 2: Look for any 3-digit number that could be a rating
    const allNumbers = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const numbers = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        const num = parseInt(text);
        if (num >= 200 && num <= 900) {
          numbers.push({
            number: num,
            text: text,
            parent: node.parentElement?.tagName,
            className: node.parentElement?.className
          });
        }
      }
      return numbers;
    });
    
    console.log(`Found ${allNumbers.length} potential ratings:`);
    allNumbers.forEach((num, i) => {
      console.log(`  ${i + 1}. ${num.number} (${num.text}) - ${num.parent} ${num.className}`);
    });
    
    // Method 3: Look for table cells
    const tableCells = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('td, th'));
      return cells.map(cell => ({
        text: cell.textContent.trim(),
        tagName: cell.tagName,
        className: cell.className
      }));
    });
    
    console.log(`\nFound ${tableCells.length} table cells:`);
    tableCells.forEach((cell, i) => {
      if (cell.text) {
        console.log(`  ${i + 1}. ${cell.text} (${cell.tagName})`);
      }
    });
    
    // Method 4: Get all text content and search for patterns
    const allText = await page.evaluate(() => document.body.textContent);
    const ratingMatch = allText.match(/\b(5\d{2}|4\d{2}|3\d{2}|2\d{2})\b/g);
    
    if (ratingMatch) {
      console.log(`\nFound potential ratings in text: ${ratingMatch.join(', ')}`);
    }
    
    console.log('\n🎯 Analysis:');
    console.log('- If we found 514, the scraper can work');
    console.log('- If not, we need to adjust the approach');
    console.log('- The gradual update system is ready once scraper works');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the fix
fixScraper().catch(console.error);
