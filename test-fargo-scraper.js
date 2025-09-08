#!/usr/bin/env node

/**
 * Test script for the Fargo Rate Scraper
 * This script tests the web scraper functionality
 */

import dotenv from 'dotenv';
import fargoScraperService from './src/services/fargoScraperService.js';

dotenv.config();

async function testFargoScraper() {
  try {
    console.log('🧪 Testing Fargo Rate Web Scraper');
    console.log('==================================\n');

    // Test with some sample player names
    const testPlayers = [
      'Brett Gonzalez',
      'Tito Rodriguez', 
      'Lawrence Anaya',
      'Ramsey Knowles',
      'Tom Barnard'
    ];

    console.log('🔍 Testing individual player searches...\n');

    for (const playerName of testPlayers) {
      try {
        console.log(`Searching for: ${playerName}`);
        const result = await fargoScraperService.testScraper(playerName);
        
        if (result) {
          console.log(`✅ Found: ${result.name} - Rating: ${result.rating}`);
        } else {
          console.log(`❌ Not found: ${playerName}`);
        }
        
        console.log('---');
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`❌ Error searching for ${playerName}: ${error.message}`);
      }
    }

    console.log('\n🎯 Testing full ladder update...\n');
    
    // Test updating a small subset of players
    try {
      const results = await fargoScraperService.updateLadderRatings('499-under');
      
      console.log('📊 Update Results:');
      console.log(`  Updated: ${results.updated}`);
      console.log(`  Not Found: ${results.notFound}`);
      console.log(`  Errors: ${results.errors}`);
      
      if (results.changes.length > 0) {
        console.log('\n📝 Changes:');
        results.changes.forEach(change => {
          console.log(`  ${change.player}: ${change.oldRating} → ${change.newRating}`);
        });
      }
      
    } catch (error) {
      console.log(`❌ Ladder update test failed: ${error.message}`);
    }

    console.log('\n🎉 Fargo Scraper Test Complete!');
    console.log('\nNext steps:');
    console.log('1. Review the results above');
    console.log('2. If successful, integrate with your daily cron job');
    console.log('3. Monitor the logs for any issues');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFargoScraper().catch(console.error);


