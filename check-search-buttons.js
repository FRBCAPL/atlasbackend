#!/usr/bin/env node

/**
 * Check what search buttons are available
 */

import puppeteer from 'puppeteer';

async function checkSearchButtons() {
  let browser = null;
  try {
    console.log('🔍 Check: Available Search Buttons');
    console.log('==================================\n');

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

    // Find all buttons on the page
    const allButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).map(btn => ({
        id: btn.id,
        text: btn.textContent.trim(),
        type: btn.type,
        className: btn.className
      }));
    });
    
    console.log('🔘 All buttons on the page:');
    allButtons.forEach((btn, index) => {
      console.log(`   ${index + 1}. ID: "${btn.id}", Text: "${btn.text}", Type: "${btn.type}"`);
    });
    
    // Find all input elements
    const allInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      return Array.from(inputs).map(input => ({
        id: input.id,
        type: input.type,
        placeholder: input.placeholder,
        className: input.className
      }));
    });
    
    console.log('\n📝 All input elements:');
    allInputs.forEach((input, index) => {
      console.log(`   ${index + 1}. ID: "${input.id}", Type: "${input.type}", Placeholder: "${input.placeholder}"`);
    });
    
    // Check if there are any forms
    const forms = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      return Array.from(forms).map(form => ({
        id: form.id,
        action: form.action,
        method: form.method,
        className: form.className
      }));
    });
    
    console.log('\n📋 All forms:');
    forms.forEach((form, index) => {
      console.log(`   ${index + 1}. ID: "${form.id}", Action: "${form.action}", Method: "${form.method}"`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the check
checkSearchButtons().catch(console.error);


