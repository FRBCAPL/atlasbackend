#!/usr/bin/env node

/**
 * Simple test to get Tom Barnard's rating from FargoRate
 */

import puppeteer from 'puppeteer';

async function simpleScraperTest() {
  let browser = null;
  try {
    console.log('🔍 Simple FargoRate Scraper Test');
    console.log('================================\n');

    browser = await puppeteer.launch({
      headless: true, // Run in background
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    console.log('🌐 Going to FargoRate...');
    await page.goto('http://fairmatch.fargorate.com', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    console.log('⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔍 Searching for Tom Barnard...');
    
    // Clear and type in search box
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Player name or id"]');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
    
    await page.type('input[placeholder="Player name or id"]', 'Tom Barnard');
    
    // Click the lookup button
    await page.click('button[id="searchPlayer-2"]');
    
    console.log('⏳ Waiting for search results...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Get all text content and look for the rating
    const pageText = await page.evaluate(() => document.body.textContent);
    
    console.log('🔍 Analyzing page content...');
    
    // Look for the specific rating 514
    if (pageText.includes('514')) {
      console.log('✅ SUCCESS! Found rating 514 on the page!');
      
      // Try to find it in context
      const lines = pageText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('514')) {
          console.log(`   Context: "${lines[i].trim()}"`);
          if (i > 0) console.log(`   Before: "${lines[i-1].trim()}"`);
          if (i < lines.length - 1) console.log(`   After: "${lines[i+1].trim()}"`);
          break;
        }
      }
    } else {
      console.log('❌ Rating 514 not found on page');
      
      // Look for any 3-digit numbers that could be ratings
      const ratingMatches = pageText.match(/\b[2-9]\d{2}\b/g);
      if (ratingMatches) {
        console.log(`   Found potential ratings: ${ratingMatches.join(', ')}`);
      }
    }
    
    // Check if we can see the table structure
    const tableExists = await page.$('#customListResults');
    if (tableExists) {
      console.log('✅ Found results table');
      
      const tableContent = await page.evaluate(() => {
        const table = document.querySelector('#customListResults');
        return table ? table.textContent : '';
      });
      
      if (tableContent.includes('514')) {
        console.log('✅ Rating 514 found in table!');
      } else {
        console.log('❌ Rating 514 not found in table');
        console.log(`   Table content: "${tableContent.substring(0, 200)}..."`);
      }
    } else {
      console.log('❌ Results table not found');
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
simpleScraperTest().catch(console.error);


