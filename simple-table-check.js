#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function simpleTableCheck() {
  let browser = null;
  try {
    console.log('🔍 Simple Table Check');
    console.log('====================\n');

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
    
    await page.type('#searchText-2', 'Tom Barnard');
    
    await page.evaluate(() => {
      const button = document.querySelector('#searchPlayer-2');
      if (button) {
        button.click();
      }
    });
    
    console.log('⏳ Waiting 15 seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('#searchResults-2');
      return table ? table.textContent : '';
    });
    
    console.log(`📊 Table content:`);
    console.log(`"${tableContent}"`);
    
    const numbers = tableContent.match(/\b\d{3,4}\b/g);
    if (numbers) {
      const ratings = numbers.filter(n => parseInt(n) >= 200 && parseInt(n) <= 900);
      console.log(`📊 Found ratings: ${ratings.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

simpleTableCheck().catch(console.error);
