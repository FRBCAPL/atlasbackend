#!/usr/bin/env node

/**
 * Test with the correct input ID and different buttons
 */

import puppeteer from 'puppeteer';

async function testCorrectElements() {
  let browser = null;
  try {
    console.log('🔍 Test: Using Correct Elements');
    console.log('==============================\n');

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

    console.log('🔍 Testing with correct input ID...');
    
    // Use the correct input ID: searchText-2
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
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try the searchPlayer button (not searchPlayer-2)
    console.log('🔍 Trying searchPlayer button...');
    await page.evaluate(() => {
      const button = document.querySelector('#searchPlayer');
      if (button) {
        button.click();
      }
    });
    
    console.log('⏳ Waiting 15 seconds for results...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
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
      
      // Try the other search button
      console.log('\n🔍 Trying searchPlayer-2 button...');
      await page.evaluate(() => {
        const input = document.querySelector('#searchText-2');
        if (input) {
          input.value = 'Tom Barnard';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const button = document.querySelector('#searchPlayer-2');
        if (button) {
          button.click();
        }
      });
      
      console.log('⏳ Waiting 15 seconds for results...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      const tableContent2 = await page.evaluate(() => {
        const table = document.querySelector('#customListResults');
        return table ? table.textContent : '';
      });
      
      console.log(`📊 Table content (second try): "${tableContent2.trim()}"`);
      
      if (tableContent2.includes('Tom') || tableContent2.includes('Barnard') || tableContent2.includes('514')) {
        console.log('✅ Found relevant content on second try!');
      } else {
        console.log('❌ Still no relevant content found');
      }
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
testCorrectElements().catch(console.error);

