#!/usr/bin/env node

/**
 * Test with the "Look up" button specifically
 */

import puppeteer from 'puppeteer';

async function testLookupButton() {
  let browser = null;
  try {
    console.log('🔍 Test: "Look up" Button');
    console.log('========================\n');

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

    // First, let's find all buttons with "Look" in the text
    const lookupButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).map(btn => ({
        id: btn.id,
        text: btn.textContent.trim(),
        type: btn.type,
        className: btn.className
      })).filter(btn => btn.text.toLowerCase().includes('look'));
    });
    
    console.log('🔘 Buttons containing "Look":');
    lookupButtons.forEach((btn, index) => {
      console.log(`   ${index + 1}. ID: "${btn.id}", Text: "${btn.text}", Type: "${btn.type}"`);
    });
    
    // Search for Tom Barnard
    console.log('\n🔍 Searching for Tom Barnard...');
    
    await page.evaluate((term) => {
      const input = document.querySelector('#searchText-2');
      if (input) {
        input.value = '';
        input.focus();
        input.value = term;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 'Tom Barnard');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to find and click a button with "Look up" (with space)
    console.log('🔍 Looking for "Look up" button...');
    const lookupButtonClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (button.textContent.trim() === 'Look up') {
          button.click();
          return true;
        }
      }
      return false;
    });
    
    if (lookupButtonClicked) {
      console.log('✅ Found and clicked "Look up" button');
    } else {
      console.log('❌ "Look up" button not found, trying "Lookup" button...');
      
      // Try the searchPlayer-2 button (which we know has "Lookup")
      await page.evaluate(() => {
        const button = document.querySelector('#searchPlayer-2');
        if (button) {
          button.click();
        }
      });
    }
    
    console.log('⏳ Waiting 20 seconds for results...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    // Check the table content
    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('#customListResults');
      return table ? table.textContent : '';
    });
    
    console.log(`📊 Table content: "${tableContent.trim()}"`);
    
    // Check if we found anything
    if (tableContent.includes('Tom') || tableContent.includes('Barnard') || tableContent.includes('514')) {
      console.log('✅ Found relevant content!');
    } else {
      console.log('❌ No relevant content found');
      
      // Let's also check if there are any other tables or result areas
      const allTables = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        return Array.from(tables).map((table, index) => ({
          index: index,
          id: table.id,
          className: table.className,
          textContent: table.textContent.trim().substring(0, 200)
        }));
      });
      
      console.log('\n📋 All tables on the page:');
      allTables.forEach(table => {
        console.log(`   Table ${table.index}: ID="${table.id}", Class="${table.className}"`);
        console.log(`   Content: "${table.textContent}"`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testLookupButton().catch(console.error);


