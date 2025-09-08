#!/usr/bin/env node

/**
 * Check what error messages are on the page
 */

import puppeteer from 'puppeteer';

async function checkErrorMessages() {
  let browser = null;
  try {
    console.log('🔍 Check: Error Messages on Page');
    console.log('===============================\n');

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

    // Search for Tom Barnard
    console.log('🔍 Searching for Tom Barnard...');
    
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
    
    await page.evaluate(() => {
      const button = document.querySelector('#searchPlayer');
      if (button) {
        button.click();
      }
    });
    
    console.log('⏳ Waiting 15 seconds for results...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Get all text content and look for error-related words
    const pageText = await page.evaluate(() => document.body.textContent);
    
    console.log('🔍 Looking for error-related content...');
    
    const errorKeywords = [
      'error', 'Error', 'ERROR',
      'not found', 'Not Found', 'NOT FOUND',
      'invalid', 'Invalid', 'INVALID',
      'failed', 'Failed', 'FAILED',
      'unauthorized', 'Unauthorized', 'UNAUTHORIZED',
      'forbidden', 'Forbidden', 'FORBIDDEN',
      'blocked', 'Blocked', 'BLOCKED',
      'rate limit', 'Rate Limit', 'RATE LIMIT',
      'too many', 'Too Many', 'TOO MANY',
      'try again', 'Try Again', 'TRY AGAIN'
    ];
    
    const foundErrors = [];
    errorKeywords.forEach(keyword => {
      if (pageText.includes(keyword)) {
        foundErrors.push(keyword);
      }
    });
    
    if (foundErrors.length > 0) {
      console.log('⚠️ Found error-related keywords:');
      foundErrors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('✅ No obvious error keywords found');
    }
    
    // Look for any red text or error styling
    const errorElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="error"], [class*="Error"], [style*="color: red"], [style*="color:red"]');
      return Array.from(elements).map(el => el.textContent.trim()).filter(text => text.length > 0);
    });
    
    if (errorElements.length > 0) {
      console.log('🔴 Found elements with error styling:');
      errorElements.forEach(element => console.log(`   - ${element}`));
    } else {
      console.log('✅ No error-styled elements found');
    }
    
    // Check if there are any console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    console.log(`📊 Console errors captured: ${consoleErrors.length}`);

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the check
checkErrorMessages().catch(console.error);

