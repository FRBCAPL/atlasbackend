#!/usr/bin/env node

/**
 * Deep investigation of FargoRate website structure
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function investigateFargoRate() {
  try {
    console.log('🔍 Deep Investigation of FargoRate Website');
    console.log('==========================================\n');

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

    // Get the main page and analyze its structure
    console.log('1. Analyzing main FargoRate page...');
    const response = await axios.get('https://www.fargorate.com', {
      headers: { 'User-Agent': userAgent },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Title: ${$('title').text()}`);
    
    // Look for all links
    const links = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text) {
        links.push({ href, text });
      }
    });
    
    console.log(`🔗 Found ${links.length} links:`);
    links.forEach(link => {
      console.log(`   ${link.text} -> ${link.href}`);
    });

    // Look for forms
    const forms = [];
    $('form').each((i, el) => {
      const action = $(el).attr('action') || 'current page';
      const method = $(el).attr('method') || 'GET';
      forms.push({ action, method });
    });
    
    console.log(`📝 Found ${forms.length} forms:`);
    forms.forEach(form => {
      console.log(`   ${form.method} -> ${form.action}`);
    });

    // Look for input fields
    const inputs = [];
    $('input').each((i, el) => {
      const type = $(el).attr('type') || 'text';
      const name = $(el).attr('name') || 'unnamed';
      const placeholder = $(el).attr('placeholder') || '';
      inputs.push({ type, name, placeholder });
    });
    
    console.log(`⌨️ Found ${inputs.length} input fields:`);
    inputs.forEach(input => {
      console.log(`   ${input.type} - ${input.name} - "${input.placeholder}"`);
    });

    // Look for JavaScript that might handle searches
    const scripts = [];
    $('script').each((i, el) => {
      const src = $(el).attr('src');
      const content = $(el).html();
      if (src) {
        scripts.push({ type: 'external', src });
      } else if (content && content.includes('search')) {
        scripts.push({ type: 'inline', content: content.substring(0, 200) + '...' });
      }
    });
    
    console.log(`📜 Found ${scripts.length} relevant scripts:`);
    scripts.forEach(script => {
      if (script.type === 'external') {
        console.log(`   External: ${script.src}`);
      } else {
        console.log(`   Inline: ${script.content}`);
      }
    });

    // Check for any data attributes or hidden elements
    const dataElements = [];
    $('[data-*]').each((i, el) => {
      const dataAttrs = [];
      Object.keys(el.attribs).forEach(attr => {
        if (attr.startsWith('data-')) {
          dataAttrs.push(`${attr}="${el.attribs[attr]}"`);
        }
      });
      if (dataAttrs.length > 0) {
        dataElements.push({ tag: el.tagName, attrs: dataAttrs.join(' ') });
      }
    });
    
    console.log(`📊 Found ${dataElements.length} elements with data attributes:`);
    dataElements.forEach(elem => {
      console.log(`   ${elem.tag}: ${elem.attrs}`);
    });

    // Look for any mentions of player, rating, search, etc.
    const bodyText = $('body').text().toLowerCase();
    const keywords = ['player', 'rating', 'search', 'lookup', 'database', 'fargo', 'billiard', 'pool'];
    
    console.log(`🔍 Keyword analysis:`);
    keywords.forEach(keyword => {
      const count = (bodyText.match(new RegExp(keyword, 'g')) || []).length;
      if (count > 0) {
        console.log(`   "${keyword}": ${count} occurrences`);
      }
    });

    console.log('\n🎯 Investigation Summary:');
    console.log('========================');
    console.log('Based on this analysis, we can see:');
    console.log(`- Main page is accessible (${response.status})`);
    console.log(`- Found ${links.length} links to explore`);
    console.log(`- Found ${forms.length} forms`);
    console.log(`- Found ${inputs.length} input fields`);
    console.log(`- Found ${scripts.length} scripts`);
    
    if (links.length > 0) {
      console.log('\n🔍 Next steps:');
      console.log('1. Explore the links found above');
      console.log('2. Look for player database or search functionality');
      console.log('3. Check if there are any API endpoints');
      console.log('4. Test the forms and inputs found');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

// Run the investigation
investigateFargoRate().catch(console.error);


