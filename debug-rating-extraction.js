#!/usr/bin/env node

/**
 * Debug the rating extraction to see what's actually in the table
 */

import puppeteer from 'puppeteer';

async function debugRatingExtraction() {
  let browser = null;
  try {
    console.log('🔍 Debug: Rating Extraction');
    console.log('===========================\n');

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

    console.log('🔍 Searching for Tom Barnard...');
    
    // Type in search box
    await page.type('#searchText-2', 'Tom Barnard');
    
    // Click the lookup button
    await page.evaluate(() => {
      const button = document.querySelector('#searchPlayer-2');
      if (button) {
        button.click();
      }
    });
    
    console.log('⏳ Waiting 15 seconds for results...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Get the content of the search results table
    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('#searchResults-2');
      return table ? table.textContent : '';
    });
    
    console.log(`📊 Table content length: ${tableContent.length}`);
    console.log(`📄 Full table content:`);
    console.log(`"${tableContent}"`);
    
    // Get the HTML structure to see the exact format
    const tableHTML = await page.evaluate(() => {
      const table = document.querySelector('#searchResults-2');
      return table ? table.innerHTML : '';
    });
    
    console.log(`\n📋 Table HTML structure:`);
    console.log(tableHTML);
    
    // Look for all numbers in the table
    const allNumbers = tableContent.match(/\b\d+\b/g);
    if (allNumbers) {
      console.log(`\n📊 All numbers found: ${allNumbers.join(', ')}`);
      
      // Filter for potential ratings (3-4 digits)
      const potentialRatings = allNumbers.filter(n => parseInt(n) >= 200 && parseInt(n) <= 900);
      console.log(`📊 Potential ratings: ${potentialRatings.join(', ')}`);
    }
    
    // Look for specific patterns around Tom Barnard
    const tomIndex = tableContent.indexOf('Tom');
    if (tomIndex !== -1) {
      const context = tableContent.substring(Math.max(0, tomIndex - 100), tomIndex + 200);
      console.log(`\n🔍 Context around "Tom": "${context}"`);
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
debugRatingExtraction().catch(console.error);

