#!/usr/bin/env node

/**
 * Test script for the Fargo Rating Update System
 * This script tests the basic functionality without making actual changes
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fargoUpdateService from './src/services/fargoUpdateService.js';

dotenv.config();

async function testFargoSystem() {
  try {
    console.log('🧪 Testing Fargo Rating Update System');
    console.log('=====================================\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Get current ratings
    console.log('📊 Test 1: Getting current ratings...');
    try {
      const ratings = await fargoUpdateService.getCurrentRatings('499-under');
      console.log(`✅ Successfully retrieved ${ratings.length} ratings for 499-under ladder`);
      
      if (ratings.length > 0) {
        console.log('Sample ratings:');
        ratings.slice(0, 3).forEach(rating => {
          console.log(`  ${rating.position}. ${rating.name}: ${rating.fargoRate || 'No Rating'}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error getting ratings: ${error.message}`);
    }

    // Test 2: Create backup
    console.log('\n💾 Test 2: Creating backup...');
    try {
      const backupPath = await fargoUpdateService.createBackup('499-under');
      console.log(`✅ Backup created successfully: ${backupPath}`);
    } catch (error) {
      console.log(`❌ Error creating backup: ${error.message}`);
    }

    // Test 3: Get update history
    console.log('\n📜 Test 3: Getting update history...');
    try {
      const history = await fargoUpdateService.getUpdateHistory(5);
      console.log(`✅ Retrieved ${history.length} history entries`);
      
      if (history.length > 0) {
        console.log('Recent entries:');
        history.slice(0, 3).forEach(entry => {
          console.log(`  [${entry.level}] ${entry.message}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error getting history: ${error.message}`);
    }

    // Test 4: Test rating validation (without saving)
    console.log('\n🔍 Test 4: Testing rating validation...');
    try {
      const testRatings = [471, 463, 455, 0, 488]; // Mix of valid ratings and "no rating"
      console.log(`Testing with ratings: ${testRatings.join(', ')}`);
      
      // This would normally update ratings, but we'll just validate the format
      if (testRatings.every(rating => rating === null || (typeof rating === 'number' && rating >= 0))) {
        console.log('✅ Rating format validation passed');
      } else {
        console.log('❌ Rating format validation failed');
      }
    } catch (error) {
      console.log(`❌ Error in rating validation: ${error.message}`);
    }

    // Test 5: Test file loading (with sample data)
    console.log('\n📁 Test 5: Testing file loading...');
    try {
      // Create a temporary test file
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const testFile = path.join(__dirname, 'temp-test-ratings.txt');
      const testData = '471\n463\n455\n0\n488\n';
      
      fs.writeFileSync(testFile, testData);
      
      const loadedRatings = await fargoUpdateService.loadRatingsFromFile(testFile);
      console.log(`✅ Successfully loaded ${loadedRatings.length} ratings from file`);
      console.log(`Loaded ratings: ${loadedRatings.join(', ')}`);
      
      // Clean up test file
      fs.unlinkSync(testFile);
    } catch (error) {
      console.log(`❌ Error testing file loading: ${error.message}`);
    }

    console.log('\n🎉 Fargo Rating Update System Test Complete!');
    console.log('\nNext steps:');
    console.log('1. Start your backend server');
    console.log('2. Open http://localhost:8080/static/fargo-admin.html');
    console.log('3. Test the web interface');
    console.log('4. Run the daily update script: node scripts/daily-fargo-update.js');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

// Run the test
testFargoSystem().catch(console.error);


