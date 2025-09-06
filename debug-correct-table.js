#!/usr/bin/env node

/**
 * Debug the correct search results table
 */

import puppeteer from 'puppeteer';

async function debugCorrectTable() {
  let browser = null;
  try {
    console.log('🔍 Debug: Correct Search Results Table');
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

    // Get the content of the correct table
    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('#searchResults-2');
      return table ? table.textContent : '';
    });
    
    console.log(`📊 Table content length: ${tableContent.length}`);
    console.log(`📄 Full table content:`);
    console.log(`"${tableContent}"`);
    
    // Look for specific patterns
    console.log('\n🔍 Pattern analysis:');
    const patterns = ['Tom', 'Barnard', '514', '401', 'Official Rating'];
    patterns.forEach(pattern => {
      if (tableContent.includes(pattern)) {
        console.log(`✅ Found: "${pattern}"`);
      } else {
        console.log(`❌ Missing: "${pattern}"`);
      }
    });
    
    // Look for any 3-4 digit numbers in the table
    const numbers = tableContent.match(/\b\d{3,4}\b/g);
    if (numbers) {
      const ratings = numbers.filter(n => parseInt(n) >= 200 && parseInt(n) <= 900);
      console.log(`\n📊 Found ratings in table: ${ratings.join(', ')}`);
    }
    
    // Get the HTML structure of the table
    const tableHTML = await page.evaluate(() => {
      const table = document.querySelector('#searchResults-2');
      return table ? table.innerHTML : '';
    });
    
    console.log(`\n📋 Table HTML structure:`);
    console.log(tableHTML.substring(0, 500) + '...');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the debug
debugCorrectTable().catch(console.error);
