#!/usr/bin/env node

/**
 * Debug what's actually in the search results table
 */

import puppeteer from 'puppeteer';

async function debugTableContent() {
  let browser = null;
  try {
    console.log('🔍 Debug: What\'s in the Search Results Table');
    console.log('============================================\n');

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

    // Get the table content
    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('#customListResults');
      return table ? table.textContent : '';
    });
    
    console.log(`📊 Table content length: ${tableContent.length}`);
    console.log(`📄 Table content: "${tableContent}"`);
    
    // Check if the table has any rows
    const tableRows = await page.evaluate(() => {
      const table = document.querySelector('#customListResults');
      if (table) {
        const rows = table.querySelectorAll('tr');
        return rows.length;
      }
      return 0;
    });
    
    console.log(`📋 Number of table rows: ${tableRows}`);
    
    // Check if the table has any cells
    const tableCells = await page.evaluate(() => {
      const table = document.querySelector('#customListResults');
      if (table) {
        const cells = table.querySelectorAll('td');
        return cells.length;
      }
      return 0;
    });
    
    console.log(`📋 Number of table cells: ${tableCells}`);
    
    // Get the full page content to see what's there
    const pageContent = await page.evaluate(() => document.body.textContent);
    
    // Look for specific patterns
    const patterns = [
      'Tom',
      'Barnard',
      '514',
      'Official Rating',
      'CO',
      'Robustness'
    ];
    
    console.log('\n🔍 Pattern analysis:');
    patterns.forEach(pattern => {
      if (pageContent.includes(pattern)) {
        console.log(`✅ Found: "${pattern}"`);
      } else {
        console.log(`❌ Missing: "${pattern}"`);
      }
    });
    
    // Look for any 3-4 digit numbers
    const numbers = pageContent.match(/\b\d{3,4}\b/g);
    if (numbers) {
      const ratings = numbers.filter(n => parseInt(n) >= 200 && parseInt(n) <= 900);
      console.log(`\n📊 Found ratings: ${ratings.join(', ')}`);
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
debugTableContent().catch(console.error);


