#!/usr/bin/env node

/**
 * Debug script to capture the actual HTML structure of the search results
 */

import puppeteer from 'puppeteer';

async function debugPageStructure() {
  let browser = null;
  try {
    console.log('🔍 Debugging Page Structure for Tom Barnard Search');
    console.log('================================================\n');

    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
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

    console.log('🌐 Navigating to FairMatch...');
    await page.goto('http://fairmatch.fargorate.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Searching for Tom Barnard...');
    const searchInput = await page.$('input[placeholder="Player name or id"]');
    if (searchInput) {
      await page.evaluate((selector, value) => {
        const element = document.querySelector(selector);
        if (element) {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 'input[placeholder="Player name or id"]', 'Tom Barnard');
    }

    const searchButton = await page.$('button[type="submit"]');
    if (searchButton) {
      await searchButton.click();
    }

    console.log('⏳ Waiting for results...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📊 Capturing page structure...');
    
    // Get all table elements
    const tables = await page.$$('table');
    console.log(`Found ${tables.length} tables`);
    
    for (let i = 0; i < tables.length; i++) {
      const tableHTML = await page.evaluate(el => el.outerHTML, tables[i]);
      console.log(`\nTable ${i + 1}:`);
      console.log(tableHTML.substring(0, 500) + '...');
    }

    // Get all elements with "rating" in class or text
    const ratingElements = await page.$$eval('*', elements => {
      return elements
        .filter(el => {
          const text = el.textContent || '';
          const className = el.className || '';
          return text.includes('514') || text.includes('Rating') || className.includes('rating');
        })
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent?.substring(0, 100),
          outerHTML: el.outerHTML?.substring(0, 200)
        }));
    });

    console.log(`\nFound ${ratingElements.length} rating-related elements:`);
    ratingElements.forEach((el, i) => {
      console.log(`\nElement ${i + 1}:`);
      console.log(`  Tag: ${el.tagName}`);
      console.log(`  Class: ${el.className}`);
      console.log(`  Text: ${el.textContent}`);
      console.log(`  HTML: ${el.outerHTML}`);
    });

    // Get the full page HTML for manual inspection
    const fullHTML = await page.content();
    console.log(`\n📄 Full page HTML length: ${fullHTML.length} characters`);
    
    // Save HTML to file for inspection
    const fs = await import('fs');
    fs.writeFileSync('debug-page.html', fullHTML);
    console.log('💾 Saved full HTML to debug-page.html');

    console.log('\n🎉 Debug Complete!');
    console.log('Check debug-page.html for the full HTML structure');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the debug
debugPageStructure().catch(console.error);



